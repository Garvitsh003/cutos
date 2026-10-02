# CutOS — Fat Loss Control Center

A zero-dependency, phone-first website for tracking a vegetarian fat-loss plan.

## What is included
- Daily calories, protein, water and meal logging
- Your exact dinner presets with raw ingredient weights
- Recipe Weight Assistant for new dishes
- Custom ingredient database using per-100g nutrition labels
- Weekly calorie budget
- Cheat/social-meal recovery with a safety cap: it never reduces the suggested target below 85% of the normal target
- 18-day pre-gym walking/stairs/dumbbell plan
- Workout logging
- Weight tracking and trend chart
- Editable profile and targets
- localStorage persistence
- PWA manifest + service worker for “Add to Home Screen” behavior
- No backend and no API key required

## Run locally
Because it is a static website, use any static server. For example:

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080.

## Deploy to Vercel
Upload this folder or push it to GitHub and import the repository into Vercel as a static site. No build command is required.

## Deploy to GitHub Pages / Netlify
Also works as a plain static website.

Nutrition values are approximate and brands vary. Edit/add ingredients using the label on your food when possible.
# cutos
