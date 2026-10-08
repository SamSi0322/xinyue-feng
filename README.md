# Xinyue Feng — portfolio

Source for **https://samsi0322.github.io/xinyue-feng/**, the portfolio of Xinyue (Lily) Feng, a Computer Science student at Kean University (class of 2027).

| Project | Live | Source |
| --- | --- | --- |
| **Wizarding World**: a Harry Potter mod for Terraria (C#, tModLoader) | [case study](https://samsi0322.github.io/xinyue-feng/work/wizarding-world/) | [SamSi0322/WizardingWorld](https://github.com/SamSi0322/WizardingWorld) |
| **The Adventures of Edgeworth**: an Ace Attorney platformer (Java Swing, ported to the web) | [play](https://samsi0322.github.io/xinyue-feng/play/edgeworth/) · [case study](https://samsi0322.github.io/xinyue-feng/work/edgeworth/) | [`projects/edgeworth`](projects/edgeworth) |
| **AI Recipe Remix**: recipes and dish photos from the ingredients you have (React, Express, OpenAI) | [demo](https://samsi0322.github.io/xinyue-feng/play/recipe-remix/) · [case study](https://samsi0322.github.io/xinyue-feng/work/recipe-remix/) | [`projects/ai-recipe-remix`](projects/ai-recipe-remix) |
| **Tic-Tac-Toe vs. AI**: rule-based AI vs. minimax, with an "AI thinking" overlay | [play](https://samsi0322.github.io/xinyue-feng/play/tic-tac-toe/) · [case study](https://samsi0322.github.io/xinyue-feng/work/tic-tac-toe/) | [`projects/tic-tac-toe`](projects/tic-tac-toe) |

## Layout

```
site/        the static website GitHub Pages serves (plain HTML/CSS/JS, no build step)
  play/      playable builds copied or built from projects/
  work/      one case-study page per project
projects/    source code for each project
scripts/     build-site.sh copies the games into site/play/ (--recipe also rebuilds the React demo)
```

## Working on it

```bash
scripts/build-site.sh --recipe                 # refresh site/play/ from projects/
python3 -m http.server 8000 --directory site   # preview at http://localhost:8000
```

Each project has its own README with setup and tests. Pushing to `main` runs every project's tests in GitHub Actions and, if they pass, deploys `site/` to GitHub Pages.

## Notes

- **Fan works.** *The Adventures of Edgeworth* and *Wizarding World* are non-commercial fan projects. *Ace Attorney* belongs to Capcom; *Harry Potter* to Warner Bros. Entertainment and J.K. Rowling; *Terraria* to Re-Logic. Third-party art and audio are credited in each project.
- **AI assistance.** The 2026 portfolio updates to these projects, and this site, were made with AI coding tools. Each project README says what is original coursework and what changed later. The original files are kept: `projects/tic-tac-toe/original/` and `projects/edgeworth/java/original-src/`.
- **Secrets.** No API keys are committed. The recipe app reads `OPENAI_API_KEY` from `projects/ai-recipe-remix/server/.env`, which is git-ignored.

© Xinyue Feng. All rights reserved unless noted otherwise. Third-party assets belong to their owners.
