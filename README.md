# Textlint Plugin LaTeX2ε

This plugin contains rough LaTeX parser which doesn't cover all syntax, but it's enough.

We welcome your contribution for adding new syntax! Thanks.

## Known Issue

This kind of syntax cannot be interpreted correctly.

```latex
\newenvironment{A}
{\begin{B}}
{\end{B}}
```

To avoid this issue, you can write them out of the file with `\input` command.

## Roadmap

- [ ] Add tests
    - [ ] Comment
    - [ ] Macro
    - [ ] Verbatim
    - [ ] Environment
    - [ ] DisplayMath
    - [ ] InlineMath
    - [ ] Document

- [ ] Skip some component with `.textlintrc`.
    - [ ] Macro
    - [ ] Environment

## Copyright

Copyright (C) 2018 TANIGUCHI Masaya ALL Rights Reserved.

## License

This software is licensed under the GPLv3 or later.
