
# Mathly

> Learn math in an interactive way

Checkout: will deploy later

---

## Tech Stack

- **Nextjs**
- **React**
- **Tailwind CSS**
- **Recharts**
- **Framer Motion**
- **Lucide/React Icons**

---

## Getting Started  

From the `explain-math` directory(cd there):

```
# install dependencies
npm install

# run dev server
npm run dev

```

Open [http://localhost:3000](http://localhost:3000) during development.

---

## Pages
* `/login` : to login to your account
* `/signup` : to create a new account
* `auth/email-confirm` : to confirm your email
* `/onboarding` : to create a username  

* `/courses` : to see all the courses
* `/dashboard` : a simple dashobard and see your activity (gh style) and your streak

* `/algebra` : to see the full lessons of algebra course
* `/algebra/lesson-name` : Yea, an interactive lesson will wait you there

* `/geometry` : to see the full lessons of the gemoetry course
* `/geometry/lesson-name` : a cool lesson with AI features

## APIs
* `/api/courses/`: to fetch all courses
* `/api/courses/[id]`: to fetch by the course id and return the lessons
* `/api/lesson/[id]`: to return the lesson data
* `/api/activity/`: to get the activity of a user (to create a gh style activity)
* `/api/update-activity/`: to update activity 
* `/api/streak/`: to fetch & calculate streak 

---
