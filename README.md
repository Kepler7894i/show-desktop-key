# Show Desktop Key

A top bar button that hides every window on the current workspace and
restores exactly those windows when clicked again. It works like Super+D, but
from the top bar.

## Install

Install with GNOME Extensions (recommended), or from the command line:

```
gnome-extensions install --force show-desktop-key@local.shell-extension.zip
gnome-extensions enable show-desktop-key@local
```

On Wayland, log out and back in after installing so GNOME Shell loads the extension.

## Behaviour

- Click once: minimises all visible windows on the current workspace.
- Click again: restores the windows this button hid. Windows you minimised
  yourself stay minimised.
- Dialogs, docks and windows that skip the taskbar are left alone.
- Does nothing while the Activities overview is open.

## Ignored applications

Open the extension's settings and add applications to **Ignored applications**.
Their windows are never minimised or restored by the button, so they stay
visible. This is useful for desktop widgets such as Conky.

Enter the app's WM_CLASS name:

- Native Wayland apps use their app ID, for example `org.gnome.Nautilus`.
- X11 apps: run `xprop WM_CLASS` in a terminal and click the window. Use the
  second value in the output.

The application picker suggests a name in this order, using the first one the
app has:

1. `StartupWMClass` from the app's desktop entry.
2. The app ID, which is the desktop file name without `.desktop`, for example
   `org.gnome.Ptyxis`.
3. The executable name.

The suggestion may not match the window's class, so check it against the
window before relying on it. Run `xprop WM_CLASS` for X11 apps, or in
Looking Glass (Alt+F2, then `lg`) run
`global.get_window_actors().map(a => a.meta_window.get_wm_class())` for
Wayland apps.

## Licence

GPL-2.0-or-later. See `LICENSE`.
