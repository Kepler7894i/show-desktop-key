// SPDX-License-Identifier: GPL-2.0-or-later

import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';
import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

// The window class a running app reports, which is what the ignore list matches.
// Falls back to the app ID (Wayland windows report it as their class), then the executable name.
const wmClassFor = app => {
    const wmClass = app.get_startup_wm_class();
    if (wmClass)
        return wmClass;

    const appId = app.get_id()?.replace(/\.desktop$/, '');
    if (appId)
        return appId;

    const executable = app.get_executable();
    return executable ? GLib.path_get_basename(executable) : '';
};

export default class ShowDesktopKeyPrefs extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        const page = new Adw.PreferencesPage();
        const group = new Adw.PreferencesGroup({
            title: _('Ignored applications'),
            description: _('Windows from these applications are never minimised or restored by the button. ' +
                'Use the WM_CLASS name, for example "conky" or "org.gnome.Nautilus".'),
        });
        page.add(group);

        const pickRow = new Adw.ActionRow({
            title: _('Choose from installed applications'),
            subtitle: _('Browse or search the application menu'),
            activatable: true,
        });
        pickRow.add_suffix(new Gtk.Image({icon_name: 'go-next-symbolic'}));
        pickRow.connect('activated', () => this._openAppPicker(window, settings));
        group.add(pickRow);

        const addRow = new Adw.EntryRow({title: _('Add application')});
        addRow.set_show_apply_button(true);
        addRow.connect('apply', () => {
            const name = addRow.get_text().trim();
            if (!name)
                return;

            const list = settings.get_strv('ignored-apps');
            if (!list.some(n => n.toLowerCase() === name.toLowerCase()))
                settings.set_strv('ignored-apps', [...list, name]);

            addRow.set_text('');
        });
        group.add(addRow);

        const rows = [];
        const rebuild = () => {
            rows.forEach(row => group.remove(row));
            rows.length = 0;

            for (const name of settings.get_strv('ignored-apps')) {
                const row = new Adw.ActionRow({title: name});

                const remove = new Gtk.Button({
                    icon_name: 'user-trash-symbolic',
                    valign: Gtk.Align.CENTER,
                    tooltip_text: _('Remove'),
                });
                remove.add_css_class('flat');
                remove.connect('clicked', () => {
                    settings.set_strv('ignored-apps',
                        settings.get_strv('ignored-apps').filter(n => n !== name));
                });

                row.add_suffix(remove);
                group.add(row);
                rows.push(row);
            }
        };

        settings.connect('changed::ignored-apps', rebuild);
        rebuild();

        window.add(page);
    }

    _openAppPicker(parent, settings) {
        const dialog = new Adw.Window({
            title: _('Choose an application'),
            transient_for: parent,
            modal: true,
            default_width: 420,
            default_height: 560,
        });

        const toolbar = new Adw.ToolbarView();
        toolbar.add_top_bar(new Adw.HeaderBar());

        const search = new Gtk.SearchEntry({
            placeholder_text: _('Search applications'),
            margin_top: 12,
            margin_start: 12,
            margin_end: 12,
            margin_bottom: 6,
        });

        const list = new Gtk.ListBox({
            selection_mode: Gtk.SelectionMode.NONE,
            css_classes: ['boxed-list'],
            margin_start: 12,
            margin_end: 12,
            margin_bottom: 12,
        });
        list.set_filter_func(row => {
            const query = search.get_text().trim().toLowerCase();
            return !query || row._searchText.includes(query);
        });
        search.connect('search-changed', () => list.invalidate_filter());

        const apps = Gio.AppInfo.get_all()
            .filter(app => app.should_show())
            .sort((a, b) => a.get_display_name().localeCompare(b.get_display_name()));

        for (const app of apps) {
            const wmClass = wmClassFor(app);
            const row = new Adw.ActionRow({
                title: app.get_display_name(),
                subtitle: wmClass,
                activatable: true,
            });
            row._searchText = `${app.get_display_name()} ${wmClass}`.toLowerCase();

            const icon = app.get_icon();
            if (icon) {
                const image = new Gtk.Image({gicon: icon, pixel_size: 32});
                row.add_prefix(image);
            }

            row.connect('activated', () => {
                const list = settings.get_strv('ignored-apps');
                if (!list.some(n => n.toLowerCase() === wmClass.toLowerCase()))
                    settings.set_strv('ignored-apps', [...list, wmClass]);
                dialog.close();
            });
            list.append(row);
        }

        const scroller = new Gtk.ScrolledWindow({
            hscrollbar_policy: Gtk.PolicyType.NEVER,
            vexpand: true,
            child: list,
        });

        const content = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL});
        content.append(search);
        content.append(scroller);
        toolbar.set_content(content);

        dialog.set_content(toolbar);
        dialog.present();
    }
}
