# XSS Hunter Express Theme Customization Guide

## Overview

The XSS Hunter Express dashboard uses the Black Dashboard theme built on Bootstrap 4. We've created a safe and easy way to customize colors and styling without breaking functionality.

## Quick Start

### Method 1: Simple Color Changes (Recommended)

1. Open `/front-end/src/assets/sass/theme-overrides.scss`
2. Uncomment the variables you want to change
3. Rebuild the frontend:
   ```bash
   cd front-end
   npm run build
   ```
4. Restart the server to see changes

### Method 2: Use a Preset Theme

The `theme-overrides.scss` file includes several ready-made themes:

- **Professional Blue** - Corporate look with blue primary colors
- **Hacker Green** - Classic terminal/Matrix style
- **Minimal Monochrome** - Black and white only
- **Sunset Orange** - Warm orange/red tones

To use a preset:
1. Open `theme-overrides.scss`
2. Find the "QUICK THEME PRESETS" section
3. Uncomment ONE preset block
4. Rebuild with `npm run build`

## Color Variables Reference

### Primary Action Colors

These are the main colors used for buttons, badges, and alerts:

| Variable | Default | Used For |
|----------|---------|----------|
| `$primary` | #e14eca (pink) | Primary buttons, active states |
| `$success` | #00f2c3 (teal) | Success messages, active status |
| `$info` | #1d8cf8 (blue) | Information alerts, edit buttons |
| `$warning` | #ff8d72 (orange) | Warning states, pause buttons |
| `$danger` | #fd5d93 (pink-red) | Delete buttons, error states |

### Background Colors

| Variable | Default | Used For |
|----------|---------|----------|
| `$background-black` | #1e1e2f | Main dashboard background |
| `$card-black-background` | #27293d | Card backgrounds |
| `$table-dark-bg` | #27293d | Table backgrounds |

### Text Colors

| Variable | Default | Used For |
|----------|---------|----------|
| `$opacity-8` | rgba(255,255,255,.8) | Primary text |
| `$opacity-6` | rgba(255,255,255,.6) | Secondary text |
| `$opacity-5` | rgba(255,255,255,.5) | Muted text |
| `$opacity-2` | rgba(255,255,255,.2) | Dividers |

## Safe Customization Tips

### ✅ DO:

1. **Test in development first**
   ```bash
   ./run-dev.sh
   ```

2. **Change one color group at a time**
   - Start with just `$primary`
   - See the effect
   - Then change others

3. **Keep semantic meaning**
   - Success = green tones
   - Warning = yellow/orange
   - Danger = red tones
   - Info = blue tones

4. **Maintain contrast ratios**
   - Text should be readable
   - Follow WCAG 2.1 guidelines
   - Test with browser dev tools

5. **Use color picker tools**
   - [Coolors.co](https://coolors.co)
   - [Adobe Color](https://color.adobe.com)
   - [Material Design Colors](https://material.io/design/color)

### ❌ DON'T:

1. **Don't edit core theme files directly**
   - Use `theme-overrides.scss` only
   - Never modify files in `/black-dashboard/` folders

2. **Don't use low contrast combinations**
   - Dark text on dark backgrounds
   - Light text on light backgrounds

3. **Don't break semantic meaning**
   - Making danger buttons green
   - Making success buttons red

## Example Customizations

### Example 1: Corporate Blue Theme

```scss
// In theme-overrides.scss
$primary:       #0056b3;  // Corporate blue
$success:       #28a745;  // Standard green
$info:          #17a2b8;  // Cyan
$warning:       #ffc107;  // Amber
$danger:        #dc3545;  // Standard red
$background-black: #1a1d23;  // Slightly bluer black
```

### Example 2: High Contrast Mode

```scss
// For better accessibility
$opacity-8:     rgba(255,255,255, .95);  // Brighter text
$opacity-6:     rgba(255,255,255, .85);  // Brighter secondary
$background-black: #000000;  // Pure black background
$card-black-background: #0a0a0a;  // Very dark cards
```

### Example 3: Brand Colors

```scss
// Match your organization's brand
$primary:       #your-brand-color;
$success:       #your-success-color;
// etc...
```

## Component-Specific Styling

### Buttons

The button colors are automatically generated from the theme colors:
- `.btn-primary` uses `$primary`
- `.btn-success` uses `$success`
- `.btn-info` uses `$info`
- `.btn-warning` uses `$warning`
- `.btn-danger` uses `$danger`

### Badges

Same as buttons:
- `.badge-success` for active payloads
- `.badge-secondary` for inactive payloads

### Tables

Table styling uses:
- `$table-dark-bg` for background
- `$table-dark-border` for borders
- `$table-dark-hover` for hover states

## Testing Your Changes

1. **Browser DevTools**
   - Use color picker to preview
   - Check contrast ratios
   - Test responsive views

2. **Accessibility Testing**
   - Use Chrome Lighthouse
   - Check WAVE tool
   - Test with screen readers

3. **Cross-browser Testing**
   - Chrome/Chromium
   - Firefox
   - Safari
   - Edge

## Reverting Changes

To go back to default theme:

1. Comment out all variables in `theme-overrides.scss`
2. Rebuild: `npm run build`
3. Clear browser cache
4. Restart server

## Advanced Customization

For more complex changes, you can:

1. Add custom CSS classes in component `<style>` sections
2. Create new SCSS partials in `/assets/sass/custom/`
3. Override Bootstrap utilities

## Troubleshooting

### Changes not appearing?
- Did you run `npm run build`?
- Clear browser cache (Ctrl+Shift+R)
- Check browser console for errors

### Colors look wrong?
- Check for typos in hex codes
- Ensure proper SCSS syntax
- Variables need `!default` flag removed when overriding

### Build errors?
- Check SCSS syntax
- Missing semicolons
- Invalid color values

## Need Help?

- Check the variables in `/assets/sass/black-dashboard/custom/_variables.scss`
- Look at component files for specific class names
- Use browser inspector to find what variables affect what elements

## Color Psychology for Security Dashboards

- **Red**: Danger, alerts, critical issues
- **Green**: Success, safe, active
- **Blue**: Information, stable, trustworthy
- **Orange/Yellow**: Warning, attention needed
- **Purple/Pink**: Primary actions, brand identity
- **Dark backgrounds**: Reduce eye strain, professional look

Remember: The goal is to enhance usability, not just aesthetics!