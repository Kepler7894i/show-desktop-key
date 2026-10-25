// SPDX-License-Identifier: GPL-2.0-or-later

import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Meta from 'gi://Meta';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

const ShowDesktopKeyButton = GObject.registerClass(
class ShowDesktopKeyButton extends PanelMenu.Button {
    _init(extension) {
        super._init(0.0, extension.metadata.name, true);
        this.add_child(new St.Icon({
            icon_name: 'view-fullscreen-symbolic',
            style_class: 'system-status-icon',
        }));

        this.connect('button-press-event', () => {
            extension.toggleDesktop();
            return Clutter.EVENT_STOP;
        });
    }
});

export default class ShowDesktopKeyExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        // Windows this button minimised and has not yet restored.
        this._hiddenWindows = new Set();
        this._indicator = new ShowDesktopKeyButton(this);
        Main.panel.addToStatusArea(this.uuid, this._indicator, 0, 'right');
    }

    disable() {
        this._indicator.destroy();
        this._indicator = null;
        this._hiddenWindows = null;
        this._settings = null;
    }

    toggleDesktop() {
        if (Main.overview.visible)
            return;

        const workspace = global.workspace_manager.get_active_workspace();
        const windows = workspace.list_windows().filter(w => !this._shouldIgnore(w));
        const visible = windows.filter(w => !w.minimized);

        // Decide by what we hid, not by what is still visible. Some windows
        // cannot be minimised, so they stay visible and would otherwise
        // stop the next click from restoring anything.
        if (this._hiddenWindows.size === 0 && visible.length > 0) {
            // Hide everything and remember what we hid, so the next click
            // restores exactly those windows.
            visible.forEach(w => {
                this._hiddenWindows.add(w);
                w.minimize();
            });
            return;
        }

        // Restore only the windows we hid. If we have no record (for example
        // after Super+D was used), fall back to restoring every minimised window.
        const candidates = this._hiddenWindows.size > 0
            ? [...this._hiddenWindows]
            : windows;
        this._hiddenWindows.clear();

        candidates.forEach(w => {
            try {
                if (w.minimized)
                    w.unminimize();
            } catch (e) {
                // The window was closed while hidden.
            }
        });
    }

    _shouldIgnore(window) {
        if (!window)
            return true;

        const type = window.get_window_type();
        if (type === Meta.WindowType.DESKTOP ||
            type === Meta.WindowType.DOCK ||
            type === Meta.WindowType.MODAL_DIALOG ||
            window.is_skip_taskbar())
            return true;

        const wmClass = (window.get_wm_class() ?? '').toLowerCase();
        return this._settings.get_strv('ignored-apps')
            .some(name => name.toLowerCase() === wmClass);
    }
}
