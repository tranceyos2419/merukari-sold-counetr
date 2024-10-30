# Merukari Sold Counter

## This is an on-going project. Some features have been implemented. Please look at \*.ts files to know the current state

Scrapping data on Merukari and export a CSV file<br>
➡️ Website to scrapse: [Merukari](https://jp.mercari.com)

# Contents

- [Specification](#Specification)
- [Implementation](#Implementation)
- [Branch](#branch)
- [Installation](#installation)
- [Development setup](#development-setup)
- [External Tools](#external-tools)
- [Reference](#reference)
- [Future work](#future-work)

# Specification

## Flowcharts

![Merukari Sold Counter - v1 3 0 drawio (2)](https://github.com/user-attachments/assets/8e2df185-f95f-4f91-90d3-9dec015271c3)

## Explanation videos

### [Explanation video 01](https://youtu.be/OArhNWXB8QE) <br>

## Examples I/O files

### [Example file 01](https://docs.google.com/spreadsheets/d/1SaieguLxp8nrFzjSr-qKWCcD1woiba4h2VKBL_SipwY/edit?usp=sharing)<br>

# Implementation

[Output]

- Fixing an issue that MSC becomes 0 after running more than about 100 rows
- Increasing the accuracy of MSC (Currently the inaccuracy is +-0 ~ 3)

* Output file has contain the same number of rows in the same order as the input file

  [Data-Handling]

- Realtime saving (Saving data each time we scrape)
- When we restart the tool, re-start from the last saving data

[Utility]

- Proxy Integration

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
pnpm run start
```

# External tools

### Proxy solutions

- [Smartproxy](https://smartproxy.com/)

# Reference

### entities:search

#### items

![Merukari-List-Item-JSON](https://github.com/user-attachments/assets/9d0bbbfe-4186-442c-9a9a-e05f070bc35a)

#### searchCondition

![CleanShot 2024-10-26 at 19 22 42@2x](https://github.com/user-attachments/assets/d89c9333-e1dc-4216-a820-7f35f5d937af)

# Future Work

- Increasing the accuracy of MSC (Currently the inaccuracy is +-0 ~ 3)
