# Photos to add

The site ships with illustrated placeholders, so nothing is ever broken. To use real photos, save them in `public/images/` with these exact names and the `.jpg` extension. No code changes are needed.

| File | Where it appears | Shape and size |
|---|---|---|
| `hero.jpg` | Top of the home page | Square or 4:5, at least 1200 px wide |
| `about.jpg` | "Your time matters" section | Square, at least 1000 px |
| `gallery-1.jpg` to `gallery-8.jpg` | Home preview and Gallery page | Square, at least 900 px (`gallery-1` is shown large) |

## Tips

- Keep one look across all photos: similar lighting and colour. Mixed stock styles look cheap.
- Check licences. Use your own photos, a free-licence stock site that allows commercial use, or AI images. Say in the README which you used.
- If you use AI images, zoom in and reject any with warped hands, tools or text.
- Compress before adding. Aim for under 300 KB each (squoosh.app works well). Next.js resizes them for each device.
- Do not use photos of real, identifiable customers without their permission.
- The browser console may show 404s for `.jpg` files until you add them. That is the placeholder fallback working.
