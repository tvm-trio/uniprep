# AI-Powered Platform for Entry Exams Preparation

This project is a web-based platform designed to help high school students prepare for ZNO/NMT exams.
It provides a personalized learning experience through diagnostic testing, adaptive study plans, progress tracking, test generation, and interactive learning tools.

## Key Features

- **User Authentication**: registration and login using email/password or social accounts, with progress data saved in a personal dashboard.
- **Initial diagnostic test**: the user takes a placement test on the selected subjects, and the system analyzes the answers and determines the level of knowledge and problematic topics.
- **Personalized study plan**: based on the results of the placement test, the system generates an individual learning plan: recommended topics, the order of their study, and progress indicators.
- **Progress tracking**: in the personal account, the user sees graphs, progress statistics, score dynamics, number of completed tasks, etc.
- **Subject-based test generation**: the ability to create a control test for any selected subject or topic. The system randomly generates questions from the database.
- **Flashcards for humanities**: flashcards mode for memorizing terms, dates, definitions - convenient for history, literature, foreign language.

## Ideas and plans for future

**1. Open-answered questions with AI evaluation**

Learners will be able to write extended answers instead of only choosing from multiple-choice options. Actually it's going to be applied to complex mathematical problems, which appear in the last section.

An AI model will:

- analyze the structure and logic of the response
- give an explanation and solving description in case of a wrong answer
- provide targeted feedback and hints for improvement
- highlight user's strengths and weaknesses

This encourages a deeper understanding and critical thinking rather than rote memorization.

**2. Email notifications & smart reminders**

We plan to add a GMail integration to send notifications about summaries of user's weekly progress, reminders about upcoming practice sessions or tests, motivational messages when milestones are achieved.

They keep students engaged and reduce procrastination, while allowing parents or tutors to receive optional reports.

**3. Tamagotchi / pet virtual companion**

A friendly pet that lives in the user’s dashboard and visually reacts to their performance. It may grow healthier or become happier when study goals are met, offer encouraging messages after a streak of successful sessions, look tired or sad if practice is skipped for several days.

- Gain XP and unlock levels as you study
- Earn visual upgrades (new outfits, colors, animations, emotions)

This creates an emotional connection and playful motivation, similar to a Tamagotchi. What partialy dismisses the previously mentioned problem of students' time management and priorities.

**_This list probably will be replenished with a lot of new other concepts, which may be implemented in future._**

## Target Audience

- High school students (grades 9–11) preparing for the External Independent Testing (ZNO) / (NMT).
- Tutors who want to track the progress of their students.
- Parents interested in their child’s progress

## Benefits

- Personalized approach: the platform adapts to each student’s knowledge level.
- Progress tracking & analytics to monitor learning outcomes.
- Gamified learning: personal pet, achievements, and rewards.
- Mobility: access from any device.

## Build

To build all apps and packages, run the following command:

```
cd my-turborepo

# With [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation) installed (recommended)
turbo build

# Without [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation), use your package manager
npx turbo build
```

## Develop

To start app write this in your cli:

### First, clone this project

```
git clone https://github.com/tvm-trio/uniprep.git
```

### Move to the project folder

```
cd uniprep
```

### Install all dependencies

```
npm install
```

### Run project (backend)

1. move to the api folder from the project root

```
cd apps/api
```

2. generate prisma client

```
npx prisma generate
```

3. setup .env credentials

4. run the backend development server

```
npm run dev
```

### Run project (both frontend and backend)

```
npm run dev
```
