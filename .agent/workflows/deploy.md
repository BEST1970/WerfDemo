---
description: deploy changes to https://werf-demo.vercel.app via GitHub push
---

# Deploy naar Vercel

Live URL: https://werf-demo.vercel.app/
GitHub repo: https://github.com/BEST1970/WerfDemo
Vercel koppelt automatisch aan de `main` branch — elke push triggert een nieuwe deploy.

## Stappen

1. Zorg dat alle wijzigingen opgeslagen zijn

// turbo
2. Stage alle gewijzigde bestanden:
```
git add .
```

// turbo
3. Commit met een beschrijvende boodschap:
```
git commit -m "feat: <beschrijving van de wijziging>"
```

// turbo
4. Push naar GitHub (Vercel deployt automatisch binnen ~30 seconden):
```
git push
```

5. Controleer de deploy op https://vercel.com/best1970s-projects/werf-demo
   Of ga direct naar https://werf-demo.vercel.app/ om het resultaat te zien.

## Tijdslijn
- Push → Vercel bouwt (~20-30 sec) → live

## Noodgeval: rollback
Via Vercel dashboard → Deployments → klik op een vorige deploy → "Promote to Production"
