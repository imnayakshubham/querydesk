# QueryDesk

QueryDesk helps a hospital's insurance desk deal with cashless claims. An AI agent does the legwork: it checks a patient's papers, drafts replies to insurers, and suggests new rules. A person on the desk reads its work and decides what happens. Every step is saved in git, so nothing is lost and anything can be undone.

It's built on [GitAgent](https://github.com/open-gitagent/gitagent). If you just want to try it, open the app and go to the **About** page. It walks you through the whole thing in seven steps.

## The problem

When a patient with cashless insurance is about to go home, the hospital sends the claim to the insurer. Often the insurer writes back with a question, like "Why was the patient in the ICU?" The patient waits while the desk finds the right document and replies.

The annoying part is that insurers ask the same questions again and again. The desk knows this, but that knowledge sits in people's heads. QueryDesk turns each answered question into a written rule, so next time the desk sends the document before anyone asks.

## How it works

The agent never acts on its own. It always works on a separate copy (a git branch), and nothing counts until a person approves it.

- **Check claim.** The agent compares the patient's documents with the rulebook and lists what's there and what's missing.
- **Draft reply.** When an insurer asks something, the agent writes a reply and says what to attach. You approve it or throw it away.
- **Propose lesson.** The agent turns that question into one new rule for the rulebook.
- **Preview impact.** Before you approve the rule, the agent tries it out on the other open claims and tells you which ones it would affect. It does this on its own branch, so the real rulebook doesn't change yet.
- **Edit, approve or reject.** You can reword the rule, approve it, or reject it. Approving merges it into the main rulebook.
- **Revert.** If an insurer stops asking for something, you remove the rule. That's saved as a change too, so you can always see what was undone and when.

Every commit says who did it: `agent` for the AI, `desk` for the person using the app, `system` for demo actions like a simulated insurer query, and `dev` for me building the app. The timelines in the app link straight to each commit on GitHub.

Before anything is merged, the app checks that the agent only touched what it's allowed to touch (claims, lessons, its notes, and the insurer section of the rulebook) and that a new rule is exactly one properly written line. Anything else is refused.

### A note on memory

GitAgent lets an agent keep its own memory, saved as commits. I kept that to short notes on purpose. Anything that actually changes how claims are checked has to become a rule that a person approves, and can read as a one-line change and undo later. I didn't want an agent that quietly teaches itself in the background.

## What's in the repo

- `agent.yaml`, `SOUL.md` and `RULES.md`: the agent's settings, its personality, and the rulebook. `RULES.md` has two parts: rules the agent can never change, and the insurer rules it learns.
- `skills/`: the four things the agent knows how to do (check a claim, reply to a query, propose a rule, preview a rule's impact).
- `claims/`, `knowledge/`, `seed/`: made-up patients, insurers and insurer questions. None of it is real.
- `src/`: the web app (Next.js). The agent only gets GitAgent's tools for reading and writing files and its memory, with no access to a shell.

How the pieces fit:

```text
Browser ── Next.js app on Render (in Docker, because GitAgent needs git)
             ├─ GitAgent: copies the repo, runs the agent on a new branch, pushes it
             └─ GitHub API: reads files and history, merges, deletes branches
           Everything lives in this one GitHub repo
```

## Running it yourself

You'll need Node 24 and git. Create a `.env` file with:

- `GITHUB_TOKEN`: a fine-grained token for this repo with read and write access to contents
- `GITHUB_REPO`: the repo, like `your-name/querydesk`
- `GEMINI_API_KEY`: a Google AI Studio key
- `GIT_AUTHOR_NAME`, `GIT_AUTHOR_EMAIL`, `GIT_COMMITTER_NAME`, `GIT_COMMITTER_EMAIL`: the name and email to put on the agent's commits

Then:

```bash
npm install
npm run dev     # start the app on localhost:3000
npm test        # run the tests
```
