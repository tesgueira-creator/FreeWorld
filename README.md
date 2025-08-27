# XenoOrigin Website

A static website exploring ancient archaeology, myths and anomalous artefacts.

## Development

### Prerequisites

- Node.js 16+ and npm 8+

### Available Scripts

- `npm run build` - Clean and build the website to the `dist/` directory
- `npm run dev` - Start development server with live reload on port 3000
- `npm start` - Serve the built website on port 3000
- `npm run preview` - Build and serve the website for preview
- `npm run clean` - Remove the `dist/` directory

### Development Workflow

1. Clone the repository
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`
4. Make changes to files in the `ANCIENT ALIENS/` directory
5. Build for production: `npm run build`
6. Preview production build: `npm run preview`

### Project Structure

```
ANCIENT ALIENS/          # Source files
├── index.html          # Homepage
├── style.css           # Main stylesheet
├── script.js           # Main JavaScript
├── public/             # Assets (images, etc.)
├── *.html              # Additional pages
├── .htaccess           # Apache configuration
├── manifest.json       # Web app manifest
├── robots.txt          # SEO configuration
└── sitemap.xml         # Sitemap

dist/                   # Built files (generated)
package.json           # Project configuration
```

The build process copies all files from `ANCIENT ALIENS/` to `dist/` for deployment.
