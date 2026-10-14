# harden in your workflow

Three files put harden into a team's everyday work. Copy them into your repository after `harden init`.

| File | Goes to | What it does |
| -- | -- | -- |
| [`AGENTS.md`](AGENTS.md) | your `AGENTS.md` or `CLAUDE.md` | the loop, for every agent, with or without the plugin |
| [`pull_request_template.md`](pull_request_template.md) | `.github/pull_request_template.md` | every PR starts with its `Brief:` line |
| [`harden.yml`](harden.yml) | `.github/workflows/harden.yml` | `harden check` on every pull request |

```bash
cd your-repo
harden init --area <your first area>
base=https://raw.githubusercontent.com/Genterai/harden/main/examples/workflow
curl -fsSL $base/AGENTS.md >> AGENTS.md
mkdir -p .github/workflows
curl -fsSL $base/pull_request_template.md -o .github/pull_request_template.md
curl -fsSL $base/harden.yml -o .github/workflows/harden.yml
harden check
```

The step-by-step guide is in the [README](../../README.md#add-it-to-your-workflow).
