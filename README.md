# Merukari Sold Counter

Scrapping data on Merukari and export a CSV file<br>
➡️ Website to scrapse: [Merukari](https://jp.mercari.com)

# Contents

- [Specification](#Specification)
- [Branch](#branch)
- [Installation](#installation)
- [Development setup](#development-setup)
- [External Tools](#external-tools)
- [Reference](#reference)

# Specification

![Flowchart - Merukari Sold Counter drawio](https://github.com/user-attachments/assets/c2317e97-3df0-4ffa-8e49-96c4f4f56616)

## Flowcharts

### [Link to Flowchart 01](https://drive.google.com/file/d/12d6nrTEbC99chwnBQGqGn8G8alWJRQ0Q/view?usp=sharing)<br>

## Exaplanation videos

### [Explanation video 01](https://youtu.be/ysg9KbQ7noQ) <br>

## Examples I/O files

### [Example file 01](https://docs.google.com/spreadsheets/d/1SaieguLxp8nrFzjSr-qKWCcD1woiba4h2VKBL_SipwY/edit?usp=sharing)<br>

# Branch

Please develop features on feature/[name] branches and merge them into the dev branch. <br>
Please leave a comment to describe what you did to each commit

> master : for the production
>
> > doc : for editing README.md <br>
> > dev : for developing the app <br>
> >
> > > feature/[name] : for developing individual features <br>
> > > bugfix/[name] : for fixing bugs

# Installation

Make sure you have node.js, and pnpm installed locally, and type the bash script in the project folder to install dependencies

```bash
pnpm i
```

# Development Setup

###### Make sure you have done installation and configuration

Run typescript compiler from npm script

```bash
pnpm run tsx [filename]
```

# External tools

### Proxy solutions

- [scrape.do](https://scrape.do/)

# Reference

### entities:search

![Merukari-List-Item-JSON](https://github.com/user-attachments/assets/9d0bbbfe-4186-442c-9a9a-e05f070bc35a)
