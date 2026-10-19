# WebArray Starter

Free, open-source HTML website templates by [WebArray](https://webarray.net).

Every template is a plain static website: open `index.html` in a browser and edit it with any text editor. No build tools, no frameworks, no backend.

**Browse and preview the templates:** https://sb-blip.github.io/webarray-starter/

## Templates

| Template | Live demo | Good for |
| --- | --- | --- |
| [Nova Business](nova-business/) | [View demo](https://sb-blip.github.io/webarray-starter/nova-business/) | Agencies, studios, professional services, small businesses, startups |

Each template folder has its own `README.md` with setup, customization and deployment instructions.

## Download a template

1. Click the green **Code** button on this page, then **Download ZIP** (or [download it directly](https://github.com/sb-blip/webarray-starter/archive/refs/heads/main.zip)).
2. Unzip it and copy the folder of the template you want, for example `nova-business/`.
3. Open that folder's `index.html` in your browser, then follow its `README.md`.

To publish a template as its own site, put the *contents* of its folder at the top level of a new repository and enable GitHub Pages. Each template README explains how.

## Repository structure

```
webarray-starter/
├── index.html          Landing page listing all templates (served by GitHub Pages)
├── 404.html            "Page not found" page for the whole site
├── nova-business/      Nova Business template (self-contained)
├── LICENSE
└── README.md
```

Adding a template: create a new folder with the template's files, then add a card to `index.html` and a row to the table above.

## License

Code and template images are released under the [MIT License](LICENSE). Each template folder also includes a `LICENSE.txt` listing the third-party components it loads (such as GSAP and Google Fonts), which have their own licenses.

All business names, people, quotes and contact details in the demos are fictional.
