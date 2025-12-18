//load test with machine utils

// import http from 'k6/http';
// import { check, group, sleep } from 'k6';
// import { Options } from 'k6/options';

// export const options: Options = {
//   stages: [
//     { duration: '20s', target: 5 },
//     { duration: '30s', target: 5 },
//     { duration: '20s', target: 0 },
//   ],
//   thresholds: {
//     'http_req_duration{type:db_api}': ['p(95)<1000'],
//     'http_req_duration{type:ai_api}': ['p(95)<60000'],
//     http_req_failed: ['rate<0.1'],
//   },
// };

// const BASE_URL = 'http://localhost:8000';
// const TEST_SUBJECT_ID = '6378d025-259b-48a6-8c58-22b6f58d36eb';

// const getRandomString = () => Math.random().toString(36).substring(7);
// const getRandomEmail = () =>
//   `k6_${__VU}_${Date.now()}_${getRandomString()}@test.com`;

// export default function () {
//   let accessToken = '';
//   let userId = '';
//   let selectedFlashcard: any = null;
//   let wrongAnswerId: string = '';

//   const params = {
//     headers: { 'Content-Type': 'application/json' },
//     tags: { type: 'db_api' },
//   };

//   group('1. Auth Flow', () => {
//     const email = getRandomEmail();
//     const password = 'password123';

//     const signUpRes = http.post(
//       `${BASE_URL}/auth/sign-up`,
//       JSON.stringify({ email, password }),
//       params,
//     );

//     const isSignUpSuccess = check(signUpRes, {
//       'Sign-up 201': (r) => r.status === 201,
//     });

//     if (!isSignUpSuccess) {
//       console.error(`Sign Up Error: ${signUpRes.status} ${signUpRes.body}`);
//       return;
//     }

//     accessToken = signUpRes.json('access_token') as string;
//     params.headers['Authorization'] = `Bearer ${accessToken}`;

//     const meRes = http.get(`${BASE_URL}/auth/me`, params);
//     if (meRes.status === 200) {
//       userId = meRes.json('id') as string;
//     }
//   });

//   sleep(1);

//   group('2. Entry Test', () => {
//     const entryRes = http.get(
//       `${BASE_URL}/flashcards/entry-test?subjectId=${TEST_SUBJECT_ID}`,
//       params,
//     );

//     check(entryRes, { 'Entry test 200': (r) => r.status === 200 });

//     if (
//       entryRes.status === 200 &&
//       entryRes.body &&
//       (entryRes.body as string).length > 0
//     ) {
//       const cards = entryRes.json() as any[];
//       if (cards.length > 0) {
//         selectedFlashcard = cards[0];
//         const wrongAnswer = selectedFlashcard.answers.find(
//           (a: any) => !a.isCorrect,
//         );
//         if (wrongAnswer) wrongAnswerId = wrongAnswer.id;
//       }
//     }
//   });

//   sleep(1);

//   if (selectedFlashcard && wrongAnswerId) {
//     group('3. Generate Study Plan', () => {
//       const payload = JSON.stringify({
//         userId: userId,
//         subjectId: TEST_SUBJECT_ID,
//         results: [
//           {
//             topicId: selectedFlashcard.topic_id,
//             flashcardId: selectedFlashcard.id,
//             answerId: wrongAnswerId,
//           },
//         ],
//       });

//       const aiParams = { headers: params.headers, tags: { type: 'ai_api' } };

//       const planRes = http.post(
//         `${BASE_URL}/study-plans/generate-study-plan`,
//         payload,
//         { ...aiParams, timeout: '60s' },
//       );

//       check(planRes, { 'Plan generated 201': (r) => r.status === 201 });
//     });
//   }

//   sleep(1);

//   group('4. Check Progress', () => {
//     const progressRes = http.get(
//       `${BASE_URL}/progress-tracker/metrix/${TEST_SUBJECT_ID}`,
//       params,
//     );

//     check(progressRes, {
//       'Progress status 200': (r) => r.status === 200,
//     });

//     if (
//       progressRes.status === 200 &&
//       progressRes.body &&
//       (progressRes.body as string).length > 0
//     ) {
//       try {
//         const body = progressRes.json() as any;
//         check(progressRes, {
//           'Metrics object received': () =>
//             body !== null && typeof body === 'object',
//         });
//       } catch (e) {
//         console.error('JSON Parse Error in Progress:', e);
//       }
//     }
//   });
// }
