# XenoOrigin Website

This project contains a static website exploring ancient archaeology and related topics.

## Shared Layout

The site uses simple [Server Side Includes](https://httpd.apache.org/docs/current/howto/ssi.html) to reuse a common header and footer across pages. The partial templates live in `ANCIENT ALIENS/partials/`:

- `partials/header.html` – navigation and skip link
- `partials/footer.html` – copyright notice and site links

To include them in a page, add the following directives:

```html
<!--#include virtual="partials/header.html" -->
...
<!--#include virtual="partials/footer.html" -->
```

When creating new pages, place the header include immediately after the opening `<body>` tag and the footer include just before `</body>`. A web server or build step that supports SSI is required so these directives are replaced with the shared markup.
