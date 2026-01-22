# Contributing to the TinyFish Cookbook

Hello fellow coder! So you have chosen (or been compelled to) add your awesome mini use case to the TinyFish cookbook, here's some basics on how this cookbook is structured, and how to send in your Pull Request to make the process as smooth as possible.

## Repository Structure

Each project lives in its own folder at the root of this repo — no nesting, no hunting around. Just a flat collection of awesome things people have built with TinyFish.

```
TinyFish-cookbook/
├── .github/
├── brand-sentiment/
├── daily-briefing/
├── price-match/
├── sales-opportunity/
├── YOUR-NEW-PROJECT/        <--- This is you!
│
├── .gitignore
├── .semgrepignore
├── .tags.json
├── .yamllint
├── Makefile
├── README.md
├── CONTRIBUTING.md
└── renovate.json
```

> note: if your new to github, some of the steps below might seem a bit intimidating if your new to contributing to open source repos, but don't worry they become second nature after a while. And if this is your first time, we'd love to get one fo our engineers to hop on a call with you and guide you through! Hit us up on the [TinyFish Discord](https://discord.gg/GQfVydYU). 

## Getting Started

1. Go ahead and fork the repo at https://github.com/tinyfish-io/TinyFish-cookbook
2. Clone this _forked version_ of the repo to your local computer
3. Create a new feature branch for your work (e.g., `git checkout -b {your-name}/cool-new-app`). **Avoid working directly on the `main` branch** to keep your fork clean.
4. Create a new folder at the root of the repo for your project and start coding!

> **Note:** If you need any help with the API, making the app, or anything at all, hit the TinyFish team up anytime at the [TinyFish Discord](https://discord.gg/GQfVydYU) (we'd love to help)

## Documentation!

Like Julius Caesar once [said](https://www.youtube.com/watch?v=xMHJGd3wwZk&list=RDxMHJGd3wwZk&start_radio=1), "I would have never conquered Rome if it wasn't for good documentation," hence, you too must write good documentation. To make things simple and consistent, we actually have a really easy template.

Each project folder **must** include a `README.md` with the following:

1. **Title**
2. **Live link**
3. **Short 2-3 liner about what your app is, and where the TinyFish API is used**
4. **Demo Video** *(gif or video format, whatever works best)*
5. **Snippet of your codebase that calls the TinyFish API** (the prompt can be truncated if its too long)
6. **How to Run the codebase** (declare any env vars that may be needed here)
7. **Architecture Diagram**

## Submitting Your Project

1. Remember to test your new app thoroughly, and make sure it's has a nice `README.md` as described in the above section
2. Push all your changes to your forked repo
3. Open a pull request, from your fork to the main TinyFish repo https://github.com/tinyfish-io/TinyFish-cookbook (main branch)
4. Sit tight! The very best TinyFish engineers will take a look, give you feedback and test your app!
5. If all's good! Your PR will be merged. Congrats! 🎉

Keep committing often and keep your code safe! And always remember, if you need anything or have any doubts, hit us up at the the [TinyFish Discord](https://discord.gg/GQfVydYU)