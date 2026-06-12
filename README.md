# Textlint Plugin LaTeX2ε
[![npm](https://img.shields.io/npm/v/textlint-plugin-latex2e.svg)](https://www.npmjs.com/package/textlint-plugin-latex2e)
[![package quality](https://packagequality.com/shield/textlint-plugin-latex2e.svg)](https://packagequality.com/#?package=textlint-plugin-latex2e)
[![actions](https://github.com/textlint/textlint-plugin-latex2e/workflows/Node%20CI/badge.svg)](https://github.com/textlint/textlint-plugins-latex2e/actions)

> [!IMPORTANT]
> ### **Maintainers wanted**
>
> This project is currently in a transition period and is looking for new maintainers, especially people who actively use both LaTeX and textlint. If you are interested in helping maintain this plugin, please comment on [issue #470](https://github.com/textlint/textlint-plugin-latex2e/issues/470).
>
> The repository will remain open for maintainer recruitment until **September 30, 2026**. If maintenance cannot continue after that date, the repository may be archived.

textlint-plugin-latex2e depends on [the LaTeX parser](https://github.com/tamuratak/latex-utensils) since v1.0.0!

## Installation

```
$ npm install textlint-plugin-latex2e
```

And add to `.textlintrc`

```
   plugins: ["latex2e"]
```

## Limitations

- Comments in `equation` environment are not parsed as AST of textlint.
  - A rule or a formatter using comments like textlint-filter-rule-comments cannot use them.

## Copyright

Copyright (C) 2018-2020 Textlint Plugin LaTeX2e Maintainers ALL Rights Reserved.

## Maintainers

- TANIGUCHI Masaya ([@tani](https://github.com/tani))
- Shoma Kokuryo ([@pddg](https://github.com/pddg))
- K Ito([@kn1cht](https://github.com/kn1cht))

### Sponsorship

This project is maintained by volunteers.
If you are using this project where it is important,
consider one time or regular donations, please.

- [❤️ GitHub Sponsors (@tani)](https://github.com/sponsors/tani)

## License

This software is licensed under the MIT License.
