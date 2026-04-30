# Entity Overlap Check

## Instructions for Claude.ai
Review these two lists and identify:
1. **DUPLICATES**: Entities in the CREATE list that already exist in RDS (exact match or variant)
2. **OVERLAPS**: Entities in the CREATE list that are variants/aliases of existing RDS entities
3. **INTERNAL DUPLICATES**: Any duplicates within the existing RDS entities themselves

For each finding, output in this format:
| CREATE Entity | RDS Match | Action | Reason |
|---------------|-----------|--------|--------|
| Entity Name | Matching RDS Name | MAP/INVESTIGATE | Why they're the same |

Common patterns to look for:
- Abbreviations (e.g., "MIT" vs "Massachusetts Institute of Technology")
- With/without "The" prefix
- Inc/Corp/LLC suffixes
- Variant spellings
- Parent company vs subsidiary

## CREATE Entities (516 total, pending for RDS creation)

1. /dev/agents
2. 2077AI Open Source Foundation
3. 4DX Ventures
4. 500 Global
5. A*STAR
6. AAAS Leshner Leadership Institute for Public Engagement with Science
7. ABN AMRO Ventures
8. ACX Grants
9. AI Accountability Lab
10. AI Safety Fund
11. AI Safety Poland
12. AI Safety Tactical Opportunities Fund
13. AMD Ventures
14. AMP
15. ARC (Alignment Research Center)
16. Aalto University
17. Aaron Maiwald
18. Abnormal AI
19. Accel
20. Acceleration Consortium
21. Accenture
22. Accordance
23. Adam Dingle
24. Adobe Ventures
25. Advanced Research Projects Agency for Health
26. Advanced Research Projects Agency-Energy
27. Advanced Research and Invention Agency (ARIA)
28. Adverb Ventures
29. Aidan O'Gara
30. Airtree Ventures
31. Akbir Khan
32. Alameda Research
33. Alan Chan
34. Alberta
35. AlbionVC
36. Alden Scientific
37. Alex Kastner
38. Alexander Turner
39. Alfred P. Sloan Foundation
40. Alibaba
41. AlleyCorp
42. Alltius
43. Alpha Venture Partners
44. Alphabet Inc.
45. Alumni Ventures
46. Amazon
47. American Association for the Advancement of Science
48. American Talent Initiative
49. Andrew Carnegie Foundation
50. Andrew Tulloch
51. Anduril Industries
52. Anil Varanasi
53. Anna Counselman
54. Annapurna Labs
55. Antimetal
56. Anusandhan National Research Foundation
57. Apache Software Foundation
58. Applied Intuition
59. Applied Materials, Inc.
60. Ash Institute for Democratic Governance and Innovation
61. Ashwinee Panda
62. Astera Institute
63. Asymmetric Security
64. Athena 2.0
65. Atla
66. Augment
67. Australian Research Council Centre of Excellence on Automated Decision-Making & Society
68. Autodesk
69. Axiamatic
70. BAE Systems
71. BDC Capital
72. BMO
73. BNDES
74. BNY
75. Baidu
76. Bain Capital Ventures
77. Baron Capital Group
78. Ben Delo
79. Bessemer Venture Partners
80. BioNTech SE
81. Blackbird Ventures
82. Blueprint
83. Bonaventure Dossou
84. Booz Allen Hamilton
85. Borderless AI
86. Brad Burnham
87. Braintrust
88. British Patient Capital
89. Bund
90. Business Development Bank of Canada
91. C5 Capital
92. CFAR
93. CIFAR
94. CNPq
95. Caisse de dépôt et placement du Québec
96. Caleb Withers
97. Callosum
98. Cambridge Enterprise
99. Cambridge Innovation Capital
100. Canada First Research Excellence Fund
101. Canada Foundation for Innovation
102. Canadian Singularity Institute for Artificial Intelligence
103. Capital One
104. Captions
105. Cardiff University
106. Carl Shulman
107. Caroline Mehl
108. Cassini Fund
109. Center for Democracy and Technology
110. Center for Existential Safety
111. Center for Mind, Brain, and Consciousness (NYU)
112. Center for Security and Emerging Technology (CSET)
113. Center on Emerging Risk Research
114. Centre for Effective Altruism
115. Centre for Human-Inspired Artificial Intelligence (CHIA)
116. Centre for Innovation and Entrepreneurship at the Rotman School of Management
117. Character Capital
118. Christian Schroeder de Witt
119. Cisco
120. Citi
121. City of Seattle
122. Civic Hall
123. Clement Delangue
124. CommonAI
125. Community Jameel
126. Composite
127. Conviction Partners
128. CoreWeave
129. Created by Humans
130. CrimsoNox Capital
131. Cylake
132. Czech Association for Effective Altruism
133. D. E. Shaw Ventures
134. DAIR
135. DARPA
136. DCVC
137. Data & Society Research Institute
138. Databricks Ventures
139. David Siegel
140. Dawn Capital
141. Decibel VC
142. DeepSeek
143. DeepTechXL Fund I
144. Delaware Innovation Space
145. Department of Commerce
146. Deutsche Forschungsgemeinschaft
147. Dieter Schwarz Foundation
148. Digital Research Alliance of Canada
149. Dragoneer
150. Draper
151. Dreamery Foundation
152. Dustin Moskovitz and Cari Tuna
153. EA Infrastructure Fund
154. EPSRC
155. Effective Altruism Foundation
156. Effective Altruism Funds
157. Effective Altruists of Berkeley
158. Eitán Sprejer
159. Elevation Capital
160. Embodied Intelligence
161. Emergent Ventures
162. Empire AI Consortium
163. Empire State Development
164. Enveil
165. Eric Ries
166. Erik Otto
167. Ethics and Governance of Artificial Intelligence Fund
168. European Commission
169. European Commission's AI Office
170. European Research Council
171. Eva Lau
172. Evolution Equity Partners
173. FPV Ventures
174. FTX Future Fund
175. Fathom (YC W21)
176. Fathom Computing
177. Federal Economic Development Agency for Southern Ontario
178. Federal Ministry of Education and Research
179. Felicis Ventures
180. Fidelity
181. Fidelity Investments Canada
182. First Minute Capital
183. Florian Tramer
184. Ford Foundation
185. Freed
186. Future Fund
187. Future of Privacy Forum
188. G42
189. GE HealthCare
190. Gabriel Mukobi
191. General Catalyst
192. General Motors
193. Giving What We Can USA Inc.
194. Global AI Opportunity Fund
195. Global Priorities Institute
196. GlobalFoundries
197. Goldman Sachs
198. Google DeepMind
199. Gordon Irlam
200. Gordon and Betty Moore Foundation
201. Government of India
202. Greenoaks Capital Partners
203. Greg Colbourn
204. Greylock
205. Grok Ventures
206. HSBC
207. HUMAIN Ventures
208. Haize Labs
209. Harvard Technology and Public Purpose program
210. Harvey
211. Hector Stiftung
212. Heising-Simons Foundation
213. Hertz Foundation
214. High-Flyer Capital Management
215. Horizon Institute for Public Service
216. Horizons Ventures
217. Huawei
218. Hugging Face
219. ICONIQ
220. INET
221. INHealthVI
222. Imbue
223. Inclusive Abundance Action
224. Index Ventures
225. Ineffable Intelligence
226. Infisical
227. Infosys Foundation
228. Innovate UK
229. Institute for Law and Ai
230. Intel Corporation
231. International Association for Safe and Ethical AI (IASEAI)
232. IvySys Technologies, LLC
233. JPMorgan Chase
234. Jakob Foerster
235. Jane Street
236. Jed McCaleb
237. Jessica Rumbelow
238. Jim Pallotta
239. John Arnold
240. John S. and James L. Knight Foundation
241. John Simon Guggenheim Memorial Foundation
242. Johns Hopkins University Applied Physics Laboratory
243. Joshua Clymer
244. Juliana Seawell
245. Julie Carson
246. Jump Capital
247. Jump Trading Group
248. Justin Dollman
249. KAIST
250. KAUST tech startups fund
251. Kamer Daron Acemoglu
252. Kavli Foundation
253. Kayhan Space
254. Kearny Jackson
255. Kim Jungsik
256. Kitware Inc.
257. LASR Labs
258. LISA (Learning Intelligent Systems Architecture)
259. Laidir Foundation
260. Lambda
261. Land Berlin
262. Land Brandenburg
263. Langsikt - Centre for Long-Term Policy
264. Leidos
265. Lemni Technologies
266. Leverhulme Trust
267. Lightcone
268. Lightspeed Venture Partners
269. Likith Govindaiah
270. Liquid Intelligent Technologies
271. Lisa Thiergart
272. Long-Term Future Fund
273. Longview
274. Look AI Ventures
275. Lord Foundation of California
276. Los Alamos National Laboratory
277. Loti AI
278. LucidWorks
279. Luke Ding
280. Luma AI
281. M12
282. MARS Programme
283. MATS Research Inc.
284. MGX
285. MIT CSAIL
286. MIT Intelligence Quest
287. MIT Lincoln Laboratory
288. MIT Work of the Future Task Force
289. MIT-Air Force AI accelerator
290. MITRE Corp.
291. Manas AI
292. Marcus Abramovitch
293. Marty Chavez
294. MatX
295. Matt McIlwain
296. Matthew Salganik
297. Max Chiswick
298. Max Planck Society
299. Melinda Gates
300. Mentee Robotics
301. Merge Labs
302. Michael Bloomberg
303. Micron Technology
304. Microsoft
305. Minderoo Foundation
306. Ministry of Science and ICT
307. Morgan Stanley
308. MosaicML
309. Mozilla Technology Fund
310. Mozilla Ventures
311. Musk Foundation
312. NASA Innovative Advanced Concepts (NIAC)
313. NDSEG
314. NFDG Ventures
315. NIH
316. NVentures
317. NYU Mind, Ethics, and Policy
318. Natcast
319. National AI Research Resource (NAIRR) pilot
320. National Artificial Intelligence Research Institutes
321. National Bank of Canada
322. National Development Fund
323. National Science Foundation
324. National Telecommunications and Information Administration
325. Natural Sciences and Engineering Research Council of Canada
326. Naver
327. Navitas Capital
328. Nebius
329. Neel Nanda
330. Netflix Inc
331. New Enterprise Associates
332. New Priorities Foundation
333. New Science
334. New Venture Fund
335. New York State
336. Nicholas Tomlin
337. Nick D'Aloisio
338. Nicolas Berggruen Charitable Trust
339. Noemi Dreksler
340. North Carolina General Assembly
341. Nous
342. Nscale
343. O'Shaughnessy Ventures
344. Office of Naval Research - MA
345. Office of Science and Technology Policy
346. Okawa Foundation
347. Okta
348. Omidyar Network
349. Ontario Early Research Award
350. Open Philanthropy
351. Open Society Foundations
352. Oracle
353. Oregon State University
354. Organisation for Economic Co-operation and Development (OECD)
355. Overland AI
356. Owl Ventures
357. PIBBSS
358. Parallel
359. Park Foundation
360. Partnership for Global Inclusivity on AI
361. Pasupalak AI Fellowship
362. Patrick J. McGovern Foundation
363. Pegatron Corporation
364. Peter Thiel Foundation
365. Phil Black
366. Phylo
367. Pivotal Research
368. Playground Global
369. Plural Platform
370. Polar Semiconductor
371. Polaris Ventures
372. PrairiesCan
373. Prime Intellect
374. Principles of Intelligence
375. Public First
376. Public Interest Tech Lab
377. Pulse AI
378. Qatar Investment Authority
379. Quantitative Foundation
380. Qube Research & Technologies
381. Quebec government
382. QuintessenceLabs
383. RAISE Invest
384. RTX Ventures
385. Rachel Weinberg
386. Rad AI
387. Radical Ventures
388. Recraft
389. Recursion Pharmaceuticals
390. Redwood Research
391. Renaissance Philanthropy
392. Research Network on Opening Governance
393. Respan
394. Responsible Technology Youth Power Fund
395. Richard King Mellon Foundation
396. Rockefeller Foundation
397. Ronald D. Sugar
398. Runway AI
399. Russell Sage Foundation
400. Ryan Kidd
401. Sacramento State University
402. Safeguarded AI programme
403. Sage Bergerson
404. Salesforce Ventures
405. Sally Gao
406. Sam Bankman-Fried
407. Samsung
408. Samsung Advanced Institute of Technology
409. Samsung Austin Semiconductor, LLC
410. Samsung Electronics
411. San Francisco Compute
412. Sands Capital
413. Sapphire Ventures
414. Saudi Arabia's National Infrastructure Fund
415. Schmidt Sciences
416. Schwartz Reisman Institute
417. Schwarz Group
418. Sentinel Bio
419. Sequoia Capital
420. Shamil Chandaria
421. Shield Technology Partners
422. Siebel Foundation
423. Siegel Family Endowment
424. Sierra
425. SigIQ
426. Silicon Valley Bank Donor Advised Fund
427. Silicon Valley Community Foundation
428. Simon Newstead
429. Simons Foundation
430. Social & Environmental Entrepreneurs, Inc.
431. Social Sciences and Humanities Research Council of Canada
432. SoftBank
433. Sony
434. Sony Innovation Fund
435. South Park Commons
436. Sozo Ventures
437. Spatial Capital
438. Squirrel AI
439. Stanford HAI
440. Stanford Impact Labs
441. Stanford's Hoover Institution
442. State Ministry of Research and Arts of Baden-Württemberg
443. State of California Department of Health Care Access and Information
444. State of Utah - Utah Attorney General's Office
445. Stepstone Group
446. Steve Newman
447. Strategic AI Research Centre
448. Strategic Innovation Fund
449. Sunil Wadhwani
450. Survival and Flourishing Fund
451. Susan Crown Exchange
452. Swiss Philanthropy Foundation
453. Swiss government
454. Symbolica AI
455. TDK Ventures
456. TU Berlin
457. Tarbell Fellowship
458. Teachers' Venture Growth
459. Technology Modernization Fund
460. Templeton World Charity Foundation
461. Tencent
462. Texas Instruments
463. Texas Semiconductor Innovation Fund
464. The Alan Turing Institute
465. The Alignment Project
466. The Andrew W. Mellon Foundation
467. The Apache Software Foundation
468. The Eric & Wendy Schmidt Fund for Strategic Innovation
469. The Ethics & Governance of AI Initiative
470. The Goodly Institute
471. The Gordon and Betty Moore Foundation
472. The Marcus Foundation
473. The Mellon Foundation
474. The NOMIS Foundation
475. Toyota
476. Truth Terminal
477. U.S. Air Force
478. U.S. Department of Health and Human Services, Administration for Children and Families
479. U.S. International Development Finance Corporation
480. UC Berkeley
481. UC Investments
482. UK AI research lab
483. UK Government
484. UK Research and Innovation
485. US Venture Partners
486. USC
487. University College London
488. University EIS Fund
489. University at Albany
490. University of Cambridge
491. University of Michigan
492. University of Toronto
493. University of Tsukuba
494. University of Waterloo
495. University of Wisconsin-Milwaukee
496. Valor Equity Partners
497. Vanderbilt University Institute of National Security
498. Vanguard Charitable
499. Vast Data
500. Vector Institute
501. Vicarious
502. Vipul Naik
503. Virtual AI Safety Unconference
504. Vitalik Buterin
505. WP Global
506. Waymo
507. Wells Fargo
508. Wenbo Guo
509. Wharton Mack Institute
510. Wing Venture Capital
511. Wolfspeed
512. Work-Bench
513. XTX Markets
514. Xianfeng David Gu
515. fal
516. xLight

## Existing RDS Entities (1635 total)

1. 100 Plus Capital [organization] (VC/Capital/Philanthropy)
2. 2025 AI Safety Index - Future of Life Institute [resource] (no category)
3. 2025 Q4 Update from our Frontier AI Risk Monitoring Platform [resource] (no category)
4. 5050 AI (by Fifty Years) [organization] (VC/Capital/Philanthropy)
5. 80,000 Hours [organization] (Think Tank/Policy Org)
6. 80,000 Hours Podcast [resource] (no category)
7. 8VC [organization] (VC/Capital/Philanthropy)
8. Aaron Courville [person] (Academic)
9. Abeba Birhane [person] (Researcher)
10. ACLU [organization] (Ethics/Bias/Rights)
11. ACM US Technology Policy Committee [organization] (Think Tank/Policy Org)
12. A Collection of AI Governance Research Ideas [resource] (no category)
13. Adam Conner [person] (Organizer)
14. Adam Evans [person] (Executive)
15. Adam Gleave [person] (Executive)
16. Adam Schumacher [person] (Organizer)
17. Adam Shimi [person] (Researcher)
18. Adam Thierer Testimony before JEC on AI & Economic Opportunity [resource] (no category)
19. Adaptive Security [organization] (Deployers & Platforms)
20. Adobe [organization] (Deployers & Platforms)
21. Adrian Weller [person] (Academic)
22. Advanced Machine Intelligence Labs [organization] (Frontier Lab)
23. Advanced Research + Invention Agency (ARIA) [organization] (Government/Agency)
24. AE Studio [organization] (AI Safety/Alignment)
25. Aether [organization] (AI Safety/Alignment)
26. AFL-CIO [organization] (Labor/Civil Society)
27. Agility Robotics [organization] (Deployers & Platforms)
28. A Guide to the AI Tribes [resource] (no category)
29. AI 2027 scenario [resource] (no category)
30. AI2050 (Schmidt Sciences) [organization] (VC/Capital/Philanthropy)
31. AI4ALL [organization] (Labor/Civil Society)
32. AI Alignment Awards [organization] (AI Safety/Alignment)
33. AI Alignment Forum [organization] (AI Safety/Alignment)
34. AI Alignment Foundation [organization] (VC/Capital/Philanthropy)
35. AI Alignment Slack [resource] (no category)
36. AI as Normal Technology [resource] (no category)
37. ai@cam [organization] (Academic)
38. Aidan Gomez [person] (Executive)
39. AI Digest [resource] (no category)
40. AI Explained [resource] (no category)
41. AI Frontiers [resource] (no category)
42. AI Fund [organization] (VC/Capital/Philanthropy)
43. AI Futures Project [organization] (AI Safety/Alignment)
44. AI Governance and Safety Institute (AIGSI) [organization] (AI Safety/Alignment)
45. AI Governance Profession Report 2025 [resource] (no category)
46. AI Governance & Safety Canada [organization] (Think Tank/Policy Org)
47. AI Grant [organization] (VC/Capital/Philanthropy)
48. AI Impacts [organization] (AI Safety/Alignment)
49. AI In Context [resource] (no category)
50. AI Lab Watch [organization] (AI Safety/Alignment)
51. AI Now Institute [organization] (Think Tank/Policy Org)
52. AI Objectives Institute [organization] (AI Safety/Alignment)
53. AI-Plans [organization] (AI Safety/Alignment)
54. AI Policy Bulletin [resource] (no category)
55. AI Policy Institute [organization] (Think Tank/Policy Org)
56. AI Prospects [resource] (no category)
57. AI Research Institute on Interaction for AI assistants (ARIA) [organization] (Academic)
58. AI Risk Explorer [resource] (no category)
59. AI Risk Mitigation Fund [organization] (VC/Capital/Philanthropy)
60. AI Risk: Why Care? [resource] (no category)
61. AI Safety Asia (AISA) [organization] (AI Safety/Alignment)
62. AI Safety at the Frontier [resource] (no category)
63. AI Safety Awareness Project (AISAP) [organization] (AI Safety/Alignment)
64. AI Safety Camp [organization] (AI Safety/Alignment)
65. AISafety.com [organization] (AI Safety/Alignment)
66. AISafety.com [resource] (no category)
67. AISafety.com: Media channels [resource] (no category)
68. AI Safety Communications Centre [organization] (AI Safety/Alignment)
69. AI Safety Dublin [organization] (AI Safety/Alignment)
70. AI Safety, Ethics and Society (Center for AI Safety) [organization] (AI Safety/Alignment)
71. AI Safety Events & Training [resource] (no category)
72. AI Safety for Fleshy Humans [resource] (no category)
73. AI Safety Foundation [organization] (AI Safety/Alignment)
74. AI Safety Funding [resource] (no category)
75. AI Safety in China [resource] (no category)
76. AI Safety Index 2025: How Frontier AI Companies | Libertify [resource] (no category)
77. AI Safety Index Winter 2025 - Future of Life Institute [resource] (no category)
78. AISafety.info [organization] (AI Safety/Alignment)
79. AI Safety Initiative at Georgia Tech [organization] (Academic)
80. AI Safety Map Anki Deck [resource] (no category)
81. AI Safety Newsletter [resource] (no category)
82. AI Safety Quest [organization] (AI Safety/Alignment)
83. AI Safety Support [resource] (no category)
84. AI Safety Support Newsletter [organization] (AI Safety/Alignment)
85. AI Safety Tactical Opportunities Fund (AISTOF) [organization] (VC/Capital/Philanthropy)
86. AI Safety Videos [resource] (no category)
87. AI Snake Oil [resource] (no category)
88. AI Standards Lab [organization] (Think Tank/Policy Org)
89. AI Tennessee Initiative [organization] (Academic)
90. AI Watch [resource] (no category)
91. AI X-risk Research Podcast [resource] (no category)
92. Ajay Agrawal [person] (Academic)
93. Ajeya Cotra [person] (Researcher)
94. Alan Davidson [person] (Policymaker)
95. Alan Descoins [person] (Executive)
96. Alexandra Mealer [person] (Policymaker)
97. Alexandra Narin [person] (Organizer)
98. Alexandra Reeve Givens [person] (Organizer)
99. Alexandria Ocasio-Cortez [person] (Policymaker)
100. Alexandr Wang [person] (Executive)
101. Alex Blania [person] (Executive)
102. Alex Bores [person] (Policymaker)
103. Alex Bores campaign [organization] (Political Campaign/PAC)
104. Alex Bores Congressional AI Framework [resource] (no category)
105. Alex Hanna [person] (Researcher)
106. Alex Heath [person] (Journalist)
107. Alex Immerman [person] (Investor)
108. Alex LeBrun [person] (Executive)
109. Algorithmic Justice League [organization] (Ethics/Bias/Rights)
110. Aligned AI [organization] (AI Safety/Alignment)
111. Alignment Ecosystem Development (AED) [organization] (AI Safety/Alignment)
112. Alignment of Complex Systems Research Group (ACS) [organization] (AI Safety/Alignment)
113. Alignment Pretraining: AI Discourse Causes Self-Fulfilling (Mis)alignment [resource] (no category)
114. Alignment Remains a Hard, Unsolved Problem [resource] (no category)
115. Alignment Research Center (ARC) [organization] (AI Safety/Alignment)
116. Alignment Research Engineer Accelerator (ARENA) [organization] (Academic)
117. Alison Gopnik [person] (Academic)
118. Allan Dafoe [person] (Researcher)
119. Allen Institute for AI [organization] (Academic)
120. Allen Karns [person] (Executive)
121. Allen Newell [person] (Researcher)
122. Alliance for a Better Future [organization] (Labor/Civil Society)
123. Alliance of Motion Picture and Television Producers [organization] (Labor/Civil Society)
124. Allie K. Miller [person] (Executive)
125. Allison Duettmann [person] (Organizer)
126. Alondra Nelson [person] (Policymaker)
127. Alphabet Inc. [organization] (Deployers & Platforms)
128. Alvaro Bedoya [person] (Policymaker)
129. Alvin Graylin [person] (Executive)
130. Amanda El-Dakhakhni [person] (Executive)
131. Amandeep Singh Gill [person] (Policymaker)
132. Amazon [organization] (Deployers & Platforms)
133. Amazon Labor Union [organization] (Labor/Civil Society)
134. Amba Kak [person] (Executive)
135. AMD [organization] (Infrastructure & Compute)
136. American Federation of Teachers [organization] (Labor/Civil Society)
137. American Mission [organization] (Political Campaign/PAC)
138. Americans for Responsible Innovation (ARI) [organization] (Think Tank/Policy Org)
139. American University [organization] (Academic)
140. Amii [organization] (Academic)
141. Amir Banifatemi [person] (Organizer)
142. Amnesty International [organization] (Ethics/Bias/Rights)
143. Amnon Shashua [person] (Executive)
144. Amrit Sidhu-Brar [person] (Researcher)
145. Amy Klobuchar [person] (Policymaker)
146. Ana Helena Ulbrich [person] (Organizer)
147. Anca Dragan [person] (Academic)
148. Andrea Miotti [person] (Organizer)
149. Andreessen Horowitz (a16z) [organization] (VC/Capital/Philanthropy)
150. Andrej Karpathy [person] (Researcher)
151. Andrew Carney [person] (Organizer)
152. Andrew Doris [person] (Organizer)
153. Andrew McAfee [person] (Academic)
154. Andrew N. Ferguson [person] (Policymaker)
155. Andrew Ng [person] (Academic)
156. Anduril Industries [organization] (Deployers & Platforms)
157. Andy Jassy [person] (Executive)
158. Andy Kim [person] (Policymaker)
159. Andy Parsons [person] (Executive)
160. Angela Virtu [person] (Academic)
161. AngelList [organization] (VC/Capital/Philanthropy)
162. Anish Acharya [person] (Investor)
163. Anjney Midha [person] (Investor)
164. Ankesh Chandaria [person] (Organizer)
165. Anna Eshoo [person] (Policymaker)
166. Anna Leshinskaya [person] (Academic)
167. Anna McAdams [person] (Organizer)
168. Anna Sztyber-Betley [person] (Researcher)
169. Anna Tong [person] (Journalist)
170. Annie Stephenson [person] (Researcher)
171. Anni Leskelä [person] (Researcher)
172. An Overview of the AI Safety Funding Situation [organization] (Media/Journalism)
173. Anson Ho [person] (Researcher)
174. Anthony Aguirre [person] (Organizer)
175. Anthony Armstrong [person] (Executive)
176. Anthropic [organization] (Frontier Lab)
177. Anthropic Institute [organization] (AI Safety/Alignment)
178. António Guterres [person] (Policymaker)
179. Anton Korinek [person] (Academic)
180. Apart Research [organization] (AI Safety/Alignment)
181. Apollo Research [organization] (AI Safety/Alignment)
182. Apple [organization] (Deployers & Platforms)
183. Arati Prabhakar [person] (Policymaker)
184. Arbital [organization] (AI Safety/Alignment)
185. Arcadia Impact [organization] (Academic)
186. Arden Berg [person] (Investor)
187. Arizona Secretary of State [organization] (Government/Agency)
188. Arkose Labs [organization] (Deployers & Platforms)
189. Arm [organization] (Infrastructure & Compute)
190. ARPA-H [organization] (Government/Agency)
191. Arthur Breitman [person] (Executive)
192. Arthur Mensch [person] (Executive)
193. Arthur Spirling [person] (Academic)
194. Arvind Narayanan [person] (Academic)
195. Ashgro [organization] (AI Safety/Alignment)
196. Ashok Elluswamy [person] (Executive)
197. ASML [organization] (Infrastructure & Compute)
198. Associated Press [organization] (Media/Journalism)
199. Association for Computing Machinery [organization] (Academic)
200. Association for Long Term Existence and Resilience (ALTER) [organization] (Think Tank/Policy Org)
201. Association for the Advancement of Artificial Intelligence (AAAI) [organization] (Academic)
202. Astera Neuro & AGI [organization] (AI Safety/Alignment)
203. Asteria Film Co. [organization] (Media/Journalism)
204. Astral Codex Ten [resource] (no category)
205. Astralis Foundation [organization] (VC/Capital/Philanthropy)
206. Athena Mentorship Program for Women (AI Alignment Research) [organization] (AI Safety/Alignment)
207. Atlas Computing [organization] (AI Safety/Alignment)
208. AT&T Bell Laboratories [organization] (Academic)
209. Attention Is All You Need [resource] (no category)
210. Audrey Tang [person] (Policymaker)
211. Avi Goldfarb [person] (Academic)
212. Ayanna Pressley [person] (Policymaker)
213. Ayushmaan Sharma [person] (Researcher)
214. Aza Raskin [person] (Organizer)
215. Azeem Azhar [person] (Researcher)
216. Ballmer Group [organization] (VC/Capital/Philanthropy)
217. Barton Paulhamus [person] (Academic)
218. Bayesian Logic Inc. [organization] (AI Safety/Alignment)
219. Baylor College of Medicine [organization] (Academic)
220. B Capital [organization] (VC/Capital/Philanthropy)
221. Beijing Institute of AI Safety and Governance (Beijing-AISI) [organization] (Think Tank/Policy Org)
222. Bei Xiao [person] (Academic)
223. Beneficial AI Foundation [organization] (AI Safety/Alignment)
224. Ben Garfinkel [person] (Researcher)
225. Ben Horowitz [person] (Investor)
226. Ben Hoskin [person] (Organizer)
227. Benjamin Grosof [person] (Policymaker)
228. Ben Mann [person] (Executive)
229. Ben Mildenhall [person] (Executive)
230. Ben Ray Luján [person] (Policymaker)
231. Ben Reinhardt [person] (Executive)
232. Ben Thompson [person] (Journalist)
233. Ben Wizner [person] (Organizer)
234. Berber Jin [person] (Journalist)
235. Berggruen Institute [organization] (Think Tank/Policy Org)
236. Berkeley AI Safety Initiative for Students (BASIS) [organization] (AI Safety/Alignment)
237. Berkeley Artificial Intelligence Research [organization] (Academic)
238. Berkeley Existential Risk Initiative (BERI) [organization] (AI Safety/Alignment)
239. Berkeley Institute for Data Science [organization] (Academic)
240. Bernie Sanders [person] (Policymaker)
241. Betsey Stevenson [person] (Academic)
242. Biden signs U.S.' first AI executive order to create safeguards [resource] (no category)
243. Bill Cassidy [person] (Policymaker)
244. Bill Gates [person] (Investor)
245. Bill Morris [person] (Executive)
246. Billy Perrigo [person] (Journalist)
247. Bill Zito [person] (Executive)
248. Bipartisan Policy Center [organization] (Think Tank/Policy Org)
249. Blackburn Unveils National Policy Framework for Artificial Intelligence - U.S. S... [resource] (no category)
250. Black in AI [organization] (Labor/Civil Society)
251. BlackRock [organization] (VC/Capital/Philanthropy)
252. Block Center for Technology and Society [organization] (Academic)
253. Bloomberg [organization] (Media/Journalism)
254. BlueDot Impact [organization] (AI Safety/Alignment)
255. Blueprint for an AI Bill of Rights [resource] (no category)
256. Børge Brende [person] (Organizer)
257. Bounded Regret [resource] (no category)
258. Brad Carson [person] (Organizer)
259. Brad Smith [person] (Executive)
260. Brandon Tseng [person] (Executive)
261. Brian Christian [person] (Cultural figure)
262. Brian Deese [person] (Policymaker)
263. Brian Long [person] (Executive)
264. Brian Schatz [person] (Policymaker)
265. British Standards Institute [organization] (Think Tank/Policy Org)
266. Brittney G [person] (Executive)
267. Brookings Institution [organization] (Think Tank/Policy Org)
268. Brown University [organization] (Academic)
269. Bruce Reed [person] (Policymaker)
270. Bryan Parno [person] (Academic)
271. Bryce Robertson [person] (Organizer)
272. Buck Shlegeris [person] (Executive)
273. Buddhism & AI Initiative [organization] (AI Safety/Alignment)
274. Bureau of Cyberspace and Digital Policy (CDP) [organization] (Government/Agency)
275. Bureau of Industry and Security (BIS) [organization] (Government/Agency)
276. ByteDance [organization] (Deployers & Platforms)
277. Cade Metz [person] (Journalist)
278. Cadenza Labs [organization] (AI Safety/Alignment)
279. California Department of General Services [organization] (Government/Agency)
280. California Department of Human Resources [organization] (Government/Agency)
281. California Department of Technology [organization] (Government/Agency)
282. California State Senate [organization] (Government/Agency)
283. Cambridge AI Safety Hub [organization] (AI Safety/Alignment)
284. Cambridge Boston Alignment Initiative (CBAI) [organization] (AI Safety/Alignment)
285. Cambridge ERA:AI Fellowship [organization] (Academic)
286. Cameron Stanley [person] (Policymaker)
287. Cameron Tice [person] (Researcher)
288. Camille Carlton [person] (Organizer)
289. Campaign for AI Safety [organization] (AI Safety/Alignment)
290. Campaign to Stop Killer Robots [organization] (Labor/Civil Society)
291. Canadian Journalism Foundation [organization] (Media/Journalism)
292. Canaries in the Coal Mine? Six Facts about the Recent Employment Effects of Artificial Intelligence [resource] (no category)
293. Can We Secure AI With Formal Methods? [resource] (no category)
294. Cara LaPointe [person] (Researcher)
295. Carina Prunkl [person] (Researcher)
296. Cari Tuna [person] (Investor)
297. Carlos De La Cruz [person] (Policymaker)
298. Carnegie Corporation of New York [organization] (VC/Capital/Philanthropy)
299. Carnegie Mellon University [organization] (Academic)
300. Carol L. Folt [person] (Academic)
301. Casey Mock [person] (Organizer)
302. Casey Newton [person] (Journalist)
303. Cassava Technologies [organization] (Deployers & Platforms)
304. Catalyze Impact [organization] (VC/Capital/Philanthropy)
305. Catherine Cortez Masto [person] (Policymaker)
306. Cathy Li [person] (Executive)
307. Cathy O'Neil [person] (Researcher)
308. Cavendish Labs [organization] (AI Safety/Alignment)
309. C.C. Wei [person] (Executive)
310. Cecilia Elena Tilli [person] (Organizer)
311. Center for AI Policy (CAIP) [organization] (AI Safety/Alignment)
312. Center for AI Risk Management & Alignment (CARMA) [organization] (AI Safety/Alignment)
313. Center for AI Safety Action Fund [organization] (AI Safety/Alignment)
314. Center for AI Safety (CAIS) [organization] (AI Safety/Alignment)
315. Center for AI Standards and Innovation (CAISI) [organization] (Government/Agency)
316. Center for American Progress [organization] (Think Tank/Policy Org)
317. Center for a New American Security (CNAS) [organization] (Think Tank/Policy Org)
318. Center for Community-Engaged Artificial Intelligence [organization] (Academic)
319. Center for Data Science [organization] (Academic)
320. Center for Democracy & Technology [organization] (Ethics/Bias/Rights)
321. Center for Human-Compatible AI (CHAI) [organization] (Academic)
322. Center for Humane Technology [organization] (Ethics/Bias/Rights)
323. Center for Law & AI Risk [organization] (Think Tank/Policy Org)
324. Center for Long-Term Cybersecurity [organization] (Academic)
325. Center for Security and Emerging Technology (CSET) [organization] (Think Tank/Policy Org)
326. Center for Strategic and International Studies (CSIS) [organization] (Think Tank/Policy Org)
327. Center on Long-Term Risk [organization] (AI Safety/Alignment)
328. Centre for Enabling EA Learning & Research (CEEALAR) [organization] (AI Safety/Alignment)
329. Centre for Future Generations [organization] (Think Tank/Policy Org)
330. Centre for Long-Term Resilience [organization] (Think Tank/Policy Org)
331. Centre for the Governance of AI (GovAI) [organization] (Think Tank/Policy Org)
332. Centre for the Study of Existential Risk (CSER) [organization] (Academic)
333. Centre pour la Sécurité de l'IA (CeSIA) [organization] (AI Safety/Alignment)
334. Charles University [organization] (Academic)
335. Charlie Rogers-Smith [person] (Researcher)
336. China AI Safety & Development Association (CnAISDA) [organization] (Think Tank/Policy Org)
337. ChinaTalk [resource] (no category)
338. Chip War [resource] (no category)
339. Chris Coons [person] (Policymaker)
340. Chris Gober [person] (Policymaker)
341. Chris Lehane [person] (Executive)
342. Chris Murphy [person] (Policymaker)
343. Chris Olah [person] (Researcher)
344. Chris Smalls [person] (Organizer)
345. Christoph Lassner [person] (Executive)
346. Chuck Schumer [person] (Policymaker)
347. Cindy Cohn [person] (Organizer)
348. CISA [organization] (Government/Agency)
349. Cisco Investments [organization] (VC/Capital/Philanthropy)
350. City University of New York [organization] (Academic)
351. Civic Signals [organization] (Think Tank/Policy Org)
352. Claire Cardie [person] (Academic)
353. Claire Zabel [person] (Executive)
354. Clare Martorana [person] (Policymaker)
355. Clarifai [organization] (Deployers & Platforms)
356. Clark Barrett [person] (Academic)
357. Clay Bavor [person] (Executive)
358. Clay Fuller [person] (Policymaker)
359. Cloudflare [organization] (Infrastructure & Compute)
360. Club for Growth Action [organization] (Political Campaign/PAC)
361. Coefficient Giving (formerly Open Philanthropy) [organization] (VC/Capital/Philanthropy)
362. Cognizant [organization] (Deployers & Platforms)
363. Cohere [organization] (Frontier Lab)
364. Coinbase [organization] (Deployers & Platforms)
365. Cold Takes [resource] (no category)
366. Colin Allred [person] (Policymaker)
367. Collective Action for Existential Safety (CAES) [organization] (AI Safety/Alignment)
368. Collective Intelligence Project [organization] (Think Tank/Policy Org)
369. Colleen Mckenzie [person] (Organizer)
370. Collège de France [organization] (Academic)
371. College of Computing, Data Science, and Society [organization] (Academic)
372. College of Connected Computing [organization] (Academic)
373. Colorado AI anti-discrimination law [resource] (no category)
374. Colorado AI Policy Work Group [organization] (Think Tank/Policy Org)
375. Columbia Law School [organization] (Academic)
376. Columbia University [organization] (Academic)
377. Common Ground between AI 2027 & AI as Normal Technology [resource] (no category)
378. Common Sense Media [organization] (Ethics/Bias/Rights)
379. Compassion in Machine Learning (CaML) [organization] (AI Safety/Alignment)
380. Computational and Biological Learning Lab (University of Cambridge) [organization] (Academic)
381. Computational Rational Agents Laboratory (CORAL) [organization] (AI Safety/Alignment)
382. Computing Power and the Governance of Artificial Intelligence [resource] (no category)
383. Congressional Artificial Intelligence Caucus [organization] (Government/Agency)
384. Conjecture [organization] (AI Safety/Alignment)
385. Connor Axiotes [person] (Executive)
386. Connor Leahy [person] (Researcher)
387. Conor McGurk [person] (Organizer)
388. Constellation Institute [organization] (AI Safety/Alignment)
389. Constitutional AI: Harmlessness from AI Feedback [resource] (no category)
390. Contramont Research [organization] (AI Safety/Alignment)
391. ControlAI [organization] (Labor/Civil Society)
392. Convergence Analysis [organization] (Think Tank/Policy Org)
393. Cooperative AI Foundation [organization] (VC/Capital/Philanthropy)
394. Cooperative AI Summer School [organization] (Academic)
395. Coordinal Research [organization] (AI Safety/Alignment)
396. Core Views on AI Safety [resource] (no category)
397. Cornell University [organization] (Academic)
398. Cory Booker [person] (Policymaker)
399. Cory Doctorow [person] (Cultural figure)
400. Cory Gardner [person] (Policymaker)
401. Corynne McSherry [person] (Organizer)
402. Council on Foreign Relations [organization] (Think Tank/Policy Org)
403. Coursera [organization] (Academic)
404. Court Watch NOLA [organization] (Labor/Civil Society)
405. Craig Martell [person] (Policymaker)
406. Craig Newmark Graduate School of Journalism [organization] (Media/Journalism)
407. Craig Newmark Philanthropies [organization] (VC/Capital/Philanthropy)
408. Craig Smith [person] (Journalist)
409. Creative Destruction Lab [organization] (Academic)
410. Credo AI [organization] (AI Safety/Alignment)
411. Crisp and Fuzzy Tasks [resource] (no category)
412. Cristiano Amon [person] (Executive)
413. CTBT organization [organization] (Government/Agency)
414. Cyborgism [organization] (AI Safety/Alignment)
415. Cynthia Lummis [person] (Policymaker)
416. DAF-MIT AI Accelerator [organization] (Government/Agency)
417. DAIR [organization] (Ethics/Bias/Rights)
418. DAIR Institute [organization] (Ethics/Bias/Rights)
419. danah boyd [person] (Academic)
420. Dan Hendrycks [person] (Researcher)
421. Daniela Amodei [person] (Executive)
422. Daniela Rus [person] (Academic)
423. Daniel Barcay [person] (Executive)
424. Daniel Clothiaux [person] (Researcher)
425. Daniel Colson [person] (Organizer)
426. Daniel Diermeier [person] (Academic)
427. Daniel Filan [person] (Researcher)
428. Daniel Gross [person] (Executive)
429. Daniel Ho [person] (Academic)
430. Daniel Kokotajlo [person] (Researcher)
431. Danielle Allen [person] (Academic)
432. Danielle Li [person] (Academic)
433. Daniel Levy [person] (Executive)
434. Daniel Murfet [person] (Researcher)
435. Daniel Paleka's Newsletter [resource] (no category)
436. Daniel Susskind [person] (Academic)
437. Dan Kagan-Kans [person] (Journalist)
438. Dan Wang [person] (Journalist)
439. Daphne Koller [person] (Academic)
440. Darden School of Business [organization] (Academic)
441. Dario Amodei [person] (Executive)
442. Darktrace [organization] (Deployers & Platforms)
443. Daron Acemoglu [person] (Academic)
444. DARPA [organization] (Government/Agency)
445. Darrell M. West [person] (Researcher)
446. Dartmouth College [organization] (Academic)
447. Data Collective [organization] (VC/Capital/Philanthropy)
448. Data & Society [organization] (Ethics/Bias/Rights)
449. Data Workers' Inquiry [organization] (Labor/Civil Society)
450. Dave McCormick [person] (Policymaker)
451. David Autor [person] (Academic)
452. David Chalmers [person] (Academic)
453. David Duvenaud [person] (Academic)
454. David Evan Harris [person] (Academic)
455. David Ha [person] (Executive)
456. David Holz [person] (Executive)
457. David Krueger [person] (Academic)
458. David Marchick [person] (Academic)
459. David Norman [person] (Executive)
460. David Sacks [person] (Policymaker)
461. David Singleton [person] (Executive)
462. Dawn Drescher [person] (Researcher)
463. Dean Ball "How I Approach AI Policy" [resource] (no category)
464. Deepa Seetharaman [person] (Journalist)
465. DeepLearning.AI [organization] (Academic)
466. DeepMind Safety Research [resource] (no category)
467. DeepSeek [organization] (Frontier Lab)
468. Defending Our Values PAC [organization] (Political Campaign/PAC)
469. Delphi Ventures [organization] (VC/Capital/Philanthropy)
470. Demis Hassabis [person] (Executive)
471. Democratic Party [organization] (Political Campaign/PAC)
472. Denise Herzing [person] (Researcher)
473. Department for Science, Innovation and Technology [organization] (Government/Agency)
474. Department of Commerce [organization] (Government/Agency)
475. Department of Defense [organization] (Government/Agency)
476. Department of Energy [organization] (Government/Agency)
477. Department of Homeland Security [organization] (Government/Agency)
478. Department of Justice [organization] (Government/Agency)
479. Dewey Murdick [person] (Academic)
480. Dick Durbin [person] (Policymaker)
481. Digitalist Papers Vol. 2 [resource] (no category)
482. Dignity in a Digital Age [resource] (no category)
483. Diogo de Lucena [person] (Researcher)
484. Divya Siddarth [person] (Researcher)
485. Donald Trump [person] (Policymaker)
486. Donations List Website [organization] (Media/Journalism)
487. Don Beyer [person] (Policymaker)
488. Don't Worry about the Vase [resource] (no category)
489. Doom Debates [resource] (no category)
490. Douglas Matty [person] (Policymaker)
491. Douglas Rushkoff [person] (Academic)
492. Dovetail Research [organization] (AI Safety/Alignment)
493. Dream NYC [organization] (Political Campaign/PAC)
494. Dr. Ian McCulloh [person] (Academic)
495. Dr Jess Whittlestone [person] (Organizer)
496. Dr Waku [resource] (no category)
497. DST Global [organization] (VC/Capital/Philanthropy)
498. Duncan Crabtree-Ireland [person] (Organizer)
499. Dustin Moskovitz [person] (Investor)
500. Dutch Network for AI Safety [organization] (AI Safety/Alignment)
501. Duy Nguyen [person] (Researcher)
502. Dwarkesh Patel [person] (Journalist)
503. Dwarkesh Podcast [resource] (no category)
504. Dylan Baker [person] (Researcher)
505. Dylan Freedman [person] (Researcher)
506. Dylan Hadfield-Menell [person] (Academic)
507. EA Infrastructure Fund [organization] (VC/Capital/Philanthropy)
508. EA Long-Term Future Fund [organization] (VC/Capital/Philanthropy)
509. Economic Security Action California [organization] (Think Tank/Policy Org)
510. EconTAI [organization] (Academic)
511. Ed Markey [person] (Policymaker)
512. Ed Newton-Rex [person] (Organizer)
513. Education and Workforce Committee [organization] (Government/Agency)
514. Edwin Chen [person] (Executive)
515. Effective Altruism Domains [resource] (no category)
516. Effective Altruism Forum [resource] (no category)
517. Effective Institutions Project [organization] (Think Tank/Policy Org)
518. Effective Thesis [organization] (Academic)
519. Effective Ventures [organization] (VC/Capital/Philanthropy)
520. E. Glen Weyl [person] (Researcher)
521. Elad Gil [person] (Investor)
522. Electric Sheep [organization] (AI Safety/Alignment)
523. Electronic Frontier Foundation [organization] (Ethics/Bias/Rights)
524. Element AI [organization] (VC/Capital/Philanthropy)
525. Elena Andreicheva [person] (Cultural figure)
526. Eleos AI [organization] (AI Safety/Alignment)
527. EleutherAI [organization] (AI Safety/Alignment)
528. ElevenLabs [organization] (Deployers & Platforms)
529. Elham Tabassi [person] (Policymaker)
530. Elicit [organization] (Deployers & Platforms)
531. Eliezer Yudkowsky [person] (Researcher)
532. Eli Lifland [person] (Researcher)
533. Eli Rose [person] (Organizer)
534. EliseAI [organization] (Deployers & Platforms)
535. Elizabeth Kelly [person] (Policymaker)
536. Elizabeth Warren [person] (Policymaker)
537. Ellie Pavlick [person] (Academic)
538. Elliston Berry [person] (Organizer)
539. Elon Musk [person] (Executive)
540. Emerson Collective [organization] (VC/Capital/Philanthropy)
541. Emily Bender [person] (Academic)
542. Emily Soice [person] (Organizer)
543. Emmett Shear [person] (Executive)
544. Emory AI Group [organization] (Academic)
545. Emory University [organization] (Academic)
546. Empire AI [organization] (Government/Agency)
547. Encode AI [organization] (Think Tank/Policy Org)
548. Encode Justice [organization] (Labor/Civil Society)
549. Engineering and Physical Sciences Research Council [organization] (Government/Agency)
550. Entrepreneur First [organization] (VC/Capital/Philanthropy)
551. Eoghan Stafford [person] (Researcher)
552. Epoch AI [organization] (AI Safety/Alignment)
553. Equilibria Network [organization] (AI Safety/Alignment)
554. EquiStamp [organization] (AI Safety/Alignment)
555. Ergo Impact [organization] (VC/Capital/Philanthropy)
556. Eric Bradlow [person] (Academic)
557. Eric Gastfriend [person] (Organizer)
558. Eric Ho [person] (Executive)
559. Eric Schmidt [person] (Executive)
560. Eric Schmitt [person] (Policymaker)
561. Erika James [person] (Academic)
562. Erik Brynjolfsson [person] (Academic)
563. Esben Kran [person] (Researcher)
564. Ethan Mollick [person] (Academic)
565. EU AI Act [resource] (no category)
566. Eugene Volokh [person] (Academic)
567. European AI Office [organization] (Government/Agency)
568. European Artificial Intelligence Board [organization] (Government/Agency)
569. European Commission [organization] (Government/Agency)
570. European Network for AI Safety (ENAIS) [organization] (AI Safety/Alignment)
571. European Union [organization] (Government/Agency)
572. Evitable [organization] (AI Safety/Alignment)
573. Evolution AI [organization] (Deployers & Platforms)
574. Executive Order on Safe, Secure, and Trustworthy AI [resource] (no category)
575. Existential Risk Observatory [organization] (AI Safety/Alignment)
576. Explainable [organization] (Media/Journalism)
577. Exponential View [organization] (Media/Journalism)
578. Ezra Klein [person] (Journalist)
579. Facebook AI Research (FAIR) [organization] (Frontier Lab)
580. FACT SHEET: Biden-Harris Administration Executive Order Directs DHS to Lead the Responsible Development of Artificial Intelligence | Homeland Security [resource] (no category)
581. Fairly Trained [organization] (Labor/Civil Society)
582. FAR.AI [organization] (AI Safety/Alignment)
583. FAR․AI YouTube channel [resource] (no category)
584. Fazl Barez [person] (Researcher)
585. Federal Trade Commission [organization] (Government/Agency)
586. Federation of American Scientists [organization] (Think Tank/Policy Org)
587. Fei-Fei Li [person] (Academic)
588. Fidji Simo [person] (Executive)
589. Financial Times [organization] (Media/Journalism)
590. Fiona Scott Morton [person] (Academic)
591. Forbes [organization] (Media/Journalism)
592. Ford Foundation [organization] (VC/Capital/Philanthropy)
593. Forecasting Research Institute [organization] (Think Tank/Policy Org)
594. Foresight Institute [organization] (Think Tank/Policy Org)
595. Forethought (AI Safety Research Nonprofit) [organization] (AI Safety/Alignment)
596. Formation Bio [organization] (Deployers & Platforms)
597. Formation Research [organization] (AI Safety/Alignment)
598. Forward Global [organization] (Think Tank/Policy Org)
599. Foundational Challenges in Assuring Alignment and Safety of Large Language Models [resource] (no category)
600. Founders Fund [organization] (VC/Capital/Philanthropy)
601. Founders Pledge [organization] (Think Tank/Policy Org)
602. Frances Lorenz [person] (Organizer)
603. Francisco Betti [person] (Organizer)
604. Francis J. Doyle III [person] (Academic)
605. Fran Drescher [person] (Organizer)
606. Frank Lucas [person] (Policymaker)
607. Frank Pasquale [person] (Academic)
608. Fred Hutchinson Cancer Center [organization] (Academic)
609. From AI to ZI [organization] (AI Safety/Alignment)
610. Frontier AI Safety Research [organization] (AI Safety/Alignment)
611. FutureHouse [organization] (AI Safety/Alignment)
612. Future Impact Group: Fellowship [organization] (Academic)
613. Future Matters [organization] (Think Tank/Policy Org)
614. Future of Humanity Institute (closed 2024) [organization] (Academic)
615. Future of Life Institute [organization] (Think Tank/Policy Org)
616. Future of Life Institute Podcast [resource] (no category)
617. Fynn Heide [person] (Organizer)
618. Gabriel Alfour [person] (Researcher)
619. Gabriel Unger [person] (Academic)
620. Ganesh Sitaraman [person] (Academic)
621. Garrison Lovely [person] (Journalist)
622. Gary Marcus [person] (Researcher)
623. Gary Peters [person] (Policymaker)
624. Gates Foundation [organization] (VC/Capital/Philanthropy)
625. Gavin Newsom [person] (Policymaker)
626. General Services Administration [organization] (Government/Agency)
627. generative.ink [organization] (AI Safety/Alignment)
628. Geodesic Research [organization] (AI Safety/Alignment)
629. Geoff Garrett [person] (Academic)
630. Geoffrey Hinton [person] (Academic)
631. George Mason University [organization] (Academic)
632. Georgetown University [organization] (Academic)
633. Gergő Gáspár [person] (Organizer)
634. Gigafund [organization] (VC/Capital/Philanthropy)
635. Giles Hooker [person] (Academic)
636. Gillian Hadfield [person] (Academic)
637. Gina Raimondo [person] (Policymaker)
638. GiveWiki [organization] (VC/Capital/Philanthropy)
639. Giving What We Can [organization] (VC/Capital/Philanthropy)
640. Global AI Frontier Lab [organization] (Government/Agency)
641. Global AI Moratorium (GAIM) [organization] (AI Safety/Alignment)
642. Global Catastrophic Risk Institute [organization] (AI Safety/Alignment)
643. Global Challenges Project [organization] (Academic)
644. Global Partnership on AI [organization] (Government/Agency)
645. Global Priorities Institute (University of Oxford) [organization] (Academic)
646. Goda Mockutė [person] (Organizer)
647. Good Ancestors [organization] (Think Tank/Policy Org)
648. Goodfire [organization] (AI Safety/Alignment)
649. Good Ventures [organization] (VC/Capital/Philanthropy)
650. Google [organization] (Deployers & Platforms)
651. Google Brain [organization] (Frontier Lab)
652. Google DeepMind [organization] (Frontier Lab)
653. Google Research [organization] (Frontier Lab)
654. Gordon M. Goldstein [person] (Policymaker)
655. Governing AI: A Blueprint for the Future [resource] (no category)
656. Governing the Commons [resource] (no category)
657. Government of Canada [organization] (Government/Agency)
658. Government Operations Agency [organization] (Government/Agency)
659. Gray Swan [organization] (AI Safety/Alignment)
660. Greenoaks Capital [organization] (VC/Capital/Philanthropy)
661. Greg Abbott [person] (Policymaker)
662. Greg Brockman [person] (Executive)
663. Greg Corrado [person] (Researcher)
664. Greg Hager [person] (Academic)
665. Gregory C. Allen [person] (Researcher)
666. Greylock [organization] (VC/Capital/Philanthropy)
667. Guillaume Lample [person] (Researcher)
668. Gwanhoo Lee [person] (Academic)
669. Halcyon Futures [organization] (VC/Capital/Philanthropy)
670. Hamish Hobbs [person] (Organizer)
671. Harmony Intelligence [organization] (AI Safety/Alignment)
672. Harshita Khera [person] (Organizer)
673. Harvard Ash Center [organization] (Academic)
674. Harvard Berkman Klein Center [organization] (Academic)
675. Harvard Faculty of Arts and Sciences [organization] (Academic)
676. Harvard University [organization] (Academic)
677. Hayden Field [person] (Journalist)
678. HEC Montréal [organization] (Academic)
679. Heidy Khlaaf [person] (Researcher)
680. Hélène Landemore [person] (Academic)
681. Helen Toner [person] (Academic)
682. Helion Energy [organization] (Infrastructure & Compute)
683. Henry Farrell [person] (Academic)
684. Henry Papadatos [person] (Executive)
685. Herb Simon [person] (Researcher)
686. Heron AI Security Initiative [organization] (AI Safety/Alignment)
687. High-Flyer AI [organization] (Frontier Lab)
688. High Impact Professionals [organization] (Labor/Civil Society)
689. Highlights of the 2023 Executive Order on Artificial ... [resource] (no category)
690. Holden Karnofsky [person] (Researcher)
691. House Bipartisan Task Force on Artificial Intelligence [organization] (Government/Agency)
692. House Committee on Science Space & Tech [organization] (Government/Agency)
693. House Democratic Commission on AI and the Innovation Economy [organization] (Government/Agency)
694. Howie Lempel [person] (Organizer)
695. How to pursue a career in technical AI alignment [organization] (AI Safety/Alignment)
696. Huawei [organization] (Infrastructure & Compute)
697. Hugo Barra [person] (Executive)
698. Humain [organization] (Frontier Lab)
699. Human-aligned AI Summer School [organization] (Academic)
700. Human Compatible [resource] (no category)
701. Humane Intelligence [organization] (Ethics/Bias/Rights)
702. Human Rights Data Analysis Group [organization] (Ethics/Bias/Rights)
703. Human Rights Watch [organization] (Ethics/Bias/Rights)
704. Humans First [organization] (Labor/Civil Society)
705. Humans in Control [organization] (AI Safety/Alignment)
706. Ian Goodfellow [person] (Researcher)
707. Ian Hogarth [person] (Investor)
708. IBM [organization] (Deployers & Platforms)
709. Idaho National Laboratory [organization] (Government/Agency)
710. Igor Babuschkin [person] (Researcher)
711. IIT Madras [organization] (Academic)
712. Iliad [organization] (AI Safety/Alignment)
713. ILINA Program [organization] (Think Tank/Policy Org)
714. Ilya Sutskever [person] (Researcher)
715. Impact Academy: Global AI Safety Fellowship [organization] (AI Safety/Alignment)
716. Impact Ops [organization] (AI Safety/Alignment)
717. Impact Research Groups [organization] (Academic)
718. Import AI [resource] (no category)
719. Indian Institute of Technology, Kanpur [organization] (Academic)
720. Inflection AI [organization] (Frontier Lab)
721. Information Technology Industry Council [organization] (Think Tank/Policy Org)
722. Inovia Capital [organization] (VC/Capital/Philanthropy)
723. In-Q-Tel [organization] (VC/Capital/Philanthropy)
724. Institute for AI Policy and Strategy (IAPS) [organization] (AI Safety/Alignment)
725. Institute for AI Policy and Strategy (IAPS) AI Policy Fellowship [organization] (Think Tank/Policy Org)
726. Institute for Information & Communications Technology Planning & Evaluation [organization] (Government/Agency)
727. Institute for Law & AI (LawAI) [organization] (Think Tank/Policy Org)
728. Intelligence Rising [organization] (AI Safety/Alignment)
729. International AI Governance Alliance (IAIGA) [organization] (AI Safety/Alignment)
730. International AI Safety Report [resource] (no category)
731. International Association for Safe and Ethical AI [organization] (AI Safety/Alignment)
732. International Association for Safe & Ethical AI (IASEAI) [organization] (AI Safety/Alignment)
733. International Telecommunication Union [organization] (Government/Agency)
734. International Trade Administration [organization] (Government/Agency)
735. Ioana Marinescu [person] (Academic)
736. Isabella Duan [person] (Researcher)
737. Ivan Zhang [person] (Executive)
738. Jaan Tallinn [person] (Investor)
739. Jace Yarbrough [person] (Policymaker)
740. Jack Clark [person] (Researcher)
741. Jacky Rosen [person] (Policymaker)
742. Jacob Andreou [person] (Executive)
743. Jacob Helberg [person] (Policymaker)
744. Jacob Hilton [person] (Executive)
745. Jacob Steinhardt [person] (Academic)
746. Jaime Sevilla [person] (Researcher)
747. Jakub Pachocki [person] (Researcher)
748. James Chua [person] (Researcher)
749. James Manyika [person] (Executive)
750. James Peng [person] (Executive)
751. James Vincent [person] (Journalist)
752. Jamie Bernardi [person] (Organizer)
753. Jan Betley [person] (Researcher)
754. Janet Haven [person] (Organizer)
755. Jan Kulveit [person] (Researcher)
756. Jan Leike [person] (Researcher)
757. janus [person] (Researcher)
758. Jared Kaplan [person] (Executive)
759. Jared Polis [person] (Policymaker)
760. Jaron Lanier [person] (Cultural figure)
761. Jasmine Brazilek [person] (Researcher)
762. Jason Furman [person] (Academic)
763. Jason Green-Lowe [person] (Organizer)
764. Jason Matheny [person] (Executive)
765. Jay Obernolte [person] (Policymaker)
766. Jean-François Gagné [person] (Executive)
767. Jeanne Shaheen [person] (Policymaker)
768. Jeff Dean [person] (Researcher)
769. Jeff Hancock [person] (Academic)
770. Jeff Leek [person] (Executive)
771. Jeffrey Kessler [person] (Policymaker)
772. Jen Easterly [person] (Policymaker)
773. Jennifer Pahlka [person] (Organizer)
774. Jenny Marron [person] (Executive)
775. Jensen Huang [person] (Executive)
776. Jérémy Andréoletti [person] (Researcher)
777. Jérôme Pesenti [person] (Executive)
778. Jerry McNerney [person] (Policymaker)
779. Jerry Moran [person] (Policymaker)
780. Jesse Clifton [person] (Organizer)
781. Jesse Hoogland [person] (Executive)
782. Jesse Jackson Jr. [person] (Policymaker)
783. Jessica Steinmann [person] (Policymaker)
784. Jim Banks [person] (Policymaker)
785. Jim Risch [person] (Policymaker)
786. Joanna Rodriguez [person] (Policymaker)
787. Joanne Jang [person] (Researcher)
788. Jobs and Democracy PAC [organization] (Political Campaign/PAC)
789. Joe Biden [person] (Policymaker)
790. Joel Kaplan [person] (Executive)
791. Joelle Pineau [person] (Executive)
792. Joe Lonsdale [person] (Investor)
793. Joey Skaf [person] (Organizer)
794. John Bargh [person] (Academic)
795. John Collison [person] (Executive)
796. John Etchemendy [person] (Academic)
797. John Hickenlooper [person] (Policymaker)
798. John Kennedy [person] (Policymaker)
799. John M. Jumper [person] (Researcher)
800. John Schulman [person] (Researcher)
801. Johns Hopkins Applied Physics Laboratory [organization] (Academic)
802. Johns Hopkins University [organization] (Academic)
803. John Tasioulas [person] (Academic)
804. John Thune [person] (Policymaker)
805. John Wentworth [person] (Researcher)
806. Joi Ito [person] (Academic)
807. Joint Economic Committee [organization] (Government/Agency)
808. Jonas Vollmer [person] (Executive)
809. Jonathan Claybrough [person] (Organizer)
810. Jonathan Kanter [person] (Policymaker)
811. Jon Husted [person] (Policymaker)
812. Joni Ernst [person] (Policymaker)
813. Joseph Stiglitz [person] (Academic)
814. Josh Gottheimer [person] (Policymaker)
815. Josh Hawley [person] (Policymaker)
816. Joshua Gans [person] (Academic)
817. Joshua Kushner [person] (Investor)
818. Josh Wolfe [person] (Investor)
819. Josh Woodward [person] (Executive)
820. Joy Buolamwini [person] (Researcher)
821. Judd Rosenblatt [person] (Executive)
822. Jukedeck [organization] (Deployers & Platforms)
823. Jules White [person] (Academic)
824. Juliana Eberschlag [person] (Organizer)
825. Juniper Ventures [organization] (VC/Capital/Philanthropy)
826. Jurist Center for Artificial Intelligence [organization] (Academic)
827. Justin Johnson [person] (Executive)
828. Kakul Srivastava [person] (Executive)
829. Kambar Orazbekov [person] (Organizer)
830. Kara Swisher [person] (Journalist)
831. Karen Hao [person] (Journalist)
832. Karén Simonyan [person] (Researcher)
833. Karl Berzins [person] (Executive)
834. Kartik Hosanagar [person] (Academic)
835. Kashmir Hill [person] (Journalist)
836. Kate Brennan [person] (Executive)
837. Kate Crawford [person] (Academic)
838. Kate Kellogg [person] (Academic)
839. Kate Larson [person] (Academic)
840. Kathleen Finlinson [person] (Researcher)
841. Kathy Hochul [person] (Policymaker)
842. Katie Britt [person] (Policymaker)
843. Kempner Institute [organization] (Academic)
844. Ken Buck [person] (Policymaker)
845. Ken Stanley [person] (Researcher)
846. Kevin Kelly [person] (Cultural figure)
847. Kevin Roose [person] (Journalist)
848. Kevin Weil [person] (Executive)
849. Kevin Werbach [person] (Academic)
850. Khan Academy [organization] (Deployers & Platforms)
851. Khosla Ventures [organization] (VC/Capital/Philanthropy)
852. Kim Stanley Robinson [person] (Cultural figure)
853. KoBold Metals [organization] (Deployers & Platforms)
854. Koen Holtman [person] (Researcher)
855. Koray Kavukcuoglu [person] (Executive)
856. Krueger AI Safety Lab (KASL) [organization] (Academic)
857. Kyle Fish [person] (Researcher)
858. Kyle O'Brien [person] (Researcher)
859. Kyle Scott [person] (Organizer)
860. Kylie Robison [person] (Journalist)
861. Kyunghyun Cho [person] (Academic)
862. Labor Demand in the Age of Generative AI : Early Evidence from the U.S. Job Posting Data [resource] (no category)
863. LandingAI [organization] (Deployers & Platforms)
864. Larry Fink [person] (Executive)
865. Latanya Sweeney [person] (Academic)
866. Laurene Powell Jobs [person] (Investor)
867. Lauren Mangla [person] (Researcher)
868. Laurie Buckhout [person] (Policymaker)
869. Laurie Locascio [person] (Policymaker)
870. Lawrence Katz [person] (Academic)
871. Lawrence Lessig [person] (Academic)
872. Lawyers' Committee for Civil Rights Under Law [organization] (Ethics/Bias/Rights)
873. LawZero [organization] (AI Safety/Alignment)
874. Leading the Future [organization] (Political Campaign/PAC)
875. Leaf: Dilemmas and Dangers in AI [organization] (Academic)
876. Leah Harrison [person] (Journalist)
877. Legal Advocates for Safe Science and Technology [organization] (AI Safety/Alignment)
878. Legal Safety Lab [organization] (AI Safety/Alignment)
879. Lennart Heim [person] (Researcher)
880. Leopold Aschenbrenner [person] (Researcher)
881. LessWrong [resource] (no category)
882. Lethal Intelligence [resource] (no category)
883. Leverhulme Centre for the Future of Intelligence [organization] (Academic)
884. Lewis Hammond [person] (Researcher)
885. Lex Fridman [person] (Journalist)
886. Lex Fridman Podcast (AI episodes) [resource] (no category)
887. Liang Wenfeng [person] (Executive)
888. Life 3.0: Being Human in the Age of AI [resource] (no category)
889. Lightcone Infrastructure [organization] (AI Safety/Alignment)
890. Lightspeed Grants [organization] (VC/Capital/Philanthropy)
891. Lila Ibrahim [person] (Executive)
892. Lily Sands [person] (Executive)
893. Lily Tsai [person] (Academic)
894. Lina Khan [person] (Policymaker)
895. Linda Linsefors [person] (Organizer)
896. Lindsey Raymond [person] (Researcher)
897. LinkedIn [organization] (Deployers & Platforms)
898. Lionheart Ventures [organization] (VC/Capital/Philanthropy)
899. Lisa Hansmann [person] (Policymaker)
900. Lisa Takeuchi Cullen [person] (Organizer)
901. Liz Shuler [person] (Organizer)
902. London AI Safety Research Labs (LASR Labs) [organization] (AI Safety/Alignment)
903. London Initiative for Safe AI (LISA) [organization] (AI Safety/Alignment)
904. Long-Term Future Fund [organization] (VC/Capital/Philanthropy)
905. Longview Philanthropy [organization] (VC/Capital/Philanthropy)
906. LTFF [organization] (VC/Capital/Philanthropy)
907. Luke Muehlhauser [person] (Organizer)
908. Luthien [organization] (AI Safety/Alignment)
909. Lux Capital [organization] (VC/Capital/Philanthropy)
910. Lynne Parker [person] (Policymaker)
911. MacArthur Foundation [organization] (VC/Capital/Philanthropy)
912. Machine Intelligence Research Institute (MIRI) [organization] (AI Safety/Alignment)
913. Machine Learning for Alignment Bootcamp (MLAB) [organization] (AI Safety/Alignment)
914. Machine Learning for Language (ML2) [organization] (Academic)
915. Machines of Loving Grace [resource] (no category)
916. Macquarie Asset Management [organization] (VC/Capital/Philanthropy)
917. Macroscopic Ventures [organization] (VC/Capital/Philanthropy)
918. Madhumita Murgia [person] (Journalist)
919. Maggie Hassan [person] (Policymaker)
920. Maithra Raghu [person] (Executive)
921. Malcolm Murray [person] (Researcher)
922. Manifold Markets [organization] (Media/Journalism)
923. Manifund [organization] (VC/Capital/Philanthropy)
924. Manish Parashar [person] (Academic)
925. Marc Andreessen [person] (Investor)
926. Marc Benioff [person] (Executive)
927. Marc Carauleanu [person] (Executive)
928. Marcel Mir Teijeiro [person] (Researcher)
929. Marco Rubio [person] (Policymaker)
930. Marc Warner [person] (Executive)
931. Margaret Mitchell [person] (Researcher)
932. Margrethe Vestager [person] (Policymaker)
933. Maria Basso [person] (Executive)
934. Maria Cantwell [person] (Policymaker)
935. Maria de la Lama [person] (Executive)
936. Mariana Mazzucato [person] (Academic)
937. Marietje Schaake [person] (Policymaker)
938. Mario Gibney [person] (Organizer)
939. Marius Hobbhahn [person] (Researcher)
940. Mark Chen [person] (Executive)
941. Mark D. Gray [person] (Policymaker)
942. Mark Muro [person] (Researcher)
943. Mark Nitzberg [person] (Executive)
944. Mark R. Meador [person] (Policymaker)
945. Mark Surman [person] (Organizer)
946. Mark Warner [person] (Policymaker)
947. Mark Zuckerberg [person] (Executive)
948. Marsha Blackburn [person] (Policymaker)
949. Marta Ziosi [person] (Researcher)
950. Martin Casado [person] (Investor)
951. Martin Heinrich [person] (Policymaker)
952. Mary Wareham [person] (Organizer)
953. Masayoshi Son [person] (Investor)
954. Massachusetts Green High Performance Computing Center [organization] (Infrastructure & Compute)
955. Massachusetts Institute of Technology [organization] (Academic)
956. Mati Staniszewski [person] (Executive)
957. Matt Botvinick [person] (Researcher)
958. Matt Clifford [person] (Investor)
959. Matt Damschroder [person] (Policymaker)
960. Matt Fredrikson [person] (Academic)
961. Matthew Johnson-Roberson [person] (Academic)
962. Matthew Prince [person] (Executive)
963. Matt O'Brien [person] (Journalist)
964. Matt Pottinger [person] (Policymaker)
965. Matt Salganik [person] (Academic)
966. Matt Turek [person] (Policymaker)
967. Max Dalton [person] (Executive)
968. Max Tegmark [person] (Academic)
969. Mayo Clinic [organization] (Deployers & Platforms)
970. McGill AI Lab [organization] (Frontier Lab)
971. McGill Centre for Intelligent Machines [organization] (Academic)
972. McGill Collaborative for AI and Society [organization] (Academic)
973. McGill University [organization] (Academic)
974. Meaning Alignment Institute [organization] (AI Safety/Alignment)
975. Median Group [organization] (AI Safety/Alignment)
976. Megan Shahi [person] (Organizer)
977. Meg Sintzel [person] (Executive)
978. Meia Chita-Tegmark [person] (Organizer)
979. Melania Trump [person] (Cultural figure)
980. Melissa Bean [person] (Policymaker)
981. Melissa Heikkilä [person] (Journalist)
982. Melissa Holyoak [person] (Policymaker)
983. Menlo Ventures [organization] (VC/Capital/Philanthropy)
984. Mentorship for Alignment Research Students (MARS) [organization] (Academic)
985. Meredith Stiehm [person] (Organizer)
986. Meredith Whittaker [person] (Organizer)
987. Meridian Cambridge [organization] (Academic)
988. Meta [organization] (Deployers & Platforms)
989. Meta AI [organization] (Frontier Lab)
990. Meta Charity Funders [organization] (VC/Capital/Philanthropy)
991. Metaculus [organization] (Think Tank/Policy Org)
992. Metaplanet [organization] (VC/Capital/Philanthropy)
993. Mfikeyi Makayi [person] (Executive)
994. MGX investment group [organization] (VC/Capital/Philanthropy)
995. Michael Genesereth [person] (Academic)
996. Michael J. Berry [person] (Academic)
997. Michael Kratsios [person] (Policymaker)
998. Michael Littman [person] (Academic)
999. Michael McCaul [person] (Policymaker)
1000. Michael Osborne [person] (Academic)
1001. Michael P. Wellman [person] (Academic)
1002. Michel Justen [person] (Journalist)
1003. Microsoft [organization] (Deployers & Platforms)
1004. Microsoft Research [organization] (Frontier Lab)
1005. Midjourney [organization] (Deployers & Platforms)
1006. Mike Braun [person] (Policymaker)
1007. Mike Johnson [person] (Policymaker)
1008. Mike Krieger [person] (Executive)
1009. Mike Rounds [person] (Policymaker)
1010. Mila [organization] (Academic)
1011. Milagros Miceli [person] (Researcher)
1012. Mila - Quebec Artificial Intelligence Institute [organization] (Academic)
1013. Miles's Substack [resource] (no category)
1014. Miles Tidmarsh [person] (Researcher)
1015. Mira Murati [person] (Executive)
1016. Mistral AI [organization] (Frontier Lab)
1017. MIT AI Risk Repository [resource] (no category)
1018. MIT Algorithmic Alignment Group [organization] (Academic)
1019. MIT Computer Science & Artificial Intelligence Laboratory [organization] (Academic)
1020. MIT CSAIL [organization] (Academic)
1021. MIT Data to AI Lab [organization] (Academic)
1022. Mitesh Khapra [person] (Academic)
1023. MIT FutureTech [organization] (Academic)
1024. MIT GOV/LAB [organization] (Academic)
1025. MIT Jameel Clinic [organization] (Academic)
1026. MIT Media Lab [organization] (Academic)
1027. MIT Schwarzman College of Computing [organization] (Academic)
1028. MIT Shaping the Future of Work [organization] (Academic)
1029. MIT Sloan [organization] (Academic)
1030. MIT study finds AI can already replace 11.7% of U.S. ... [resource] (no category)
1031. MIT Technology Review [organization] (Media/Journalism)
1032. ML4Good Laboratory - New York University [organization] (Academic)
1033. ML & AI Safety Updates [organization] (Media/Journalism)
1034. ML Alignment & Theory Scholars (MATS) [organization] (AI Safety/Alignment)
1035. ML Safety Newsletter [resource] (no category)
1036. Mobileye [organization] (Deployers & Platforms)
1037. Model Evaluation and Threat Research [organization] (AI Safety/Alignment)
1038. Model Evaluation & Threat Research (METR) [organization] (AI Safety/Alignment)
1039. Modeling Cooperation [organization] (AI Safety/Alignment)
1040. Mohammed bin Salman [person] (Executive)
1041. Molly Crabapple [person] (Cultural figure)
1042. Molly Kinder [person] (Researcher)
1043. Mox [organization] (AI Safety/Alignment)
1044. Mozilla Foundation [organization] (Ethics/Bias/Rights)
1045. Munich Security Conference [organization] (Think Tank/Policy Org)
1046. Mustafa Suleyman [person] (Executive)
1047. Mythos Ventures [organization] (VC/Capital/Philanthropy)
1048. Naomi Klein [person] (Cultural figure)
1049. Narrow Path (by ControlAI) [organization] (AI Safety/Alignment)
1050. NASA Ames Research Center [organization] (Government/Agency)
1051. Natasha Lyonne [person] (Cultural figure)
1052. Nate Soares [person] (Researcher)
1053. Nate Thomas [person] (Executive)
1054. Nat Friedman [person] (Investor)
1055. Nathaniel Persily [person] (Academic)
1056. Nathaniel Whittemore [person] (Journalist)
1057. Nathan Lambert [person] (Researcher)
1058. National Artificial Intelligence Advisory Commission [organization] (Government/Agency)
1059. National Artificial Intelligence Initiative Office [organization] (Government/Agency)
1060. National Bureau of Economic Research (NBER) [organization] (Academic)
1061. National Infrastructure Fund [organization] (Infrastructure & Compute)
1062. National Institute of Standards and Technology [organization] (Government/Agency)
1063. National Institutes of Health [organization] (Government/Agency)
1064. National Republican Senatorial Committee [organization] (Political Campaign/PAC)
1065. National Security Council (NSC) [organization] (Government/Agency)
1066. Naval Ravikant [person] (Investor)
1067. Navrina Singh [person] (Executive)
1068. Ned Finkle [person] (Executive)
1069. Neil Lawrence [person] (Academic)
1070. Neil Thompson [person] (Academic)
1071. Neuralink [organization] (Infrastructure & Compute)
1072. Neuronpedia [organization] (AI Safety/Alignment)
1073. New Consensus [organization] (Think Tank/Policy Org)
1074. New Consensus AI platform [resource] (no category)
1075. New York State Assembly [organization] (Government/Agency)
1076. New York University [organization] (Academic)
1077. Nicholas Emery-Xu [person] (Researcher)
1078. Nicholas Jitkoff [person] (Executive)
1079. NicholasKees [person] (Researcher)
1080. Nick Beckstead [person] (Organizer)
1081. Nick Bostrom [person] (Researcher)
1082. Nick Frosst [person] (Executive)
1083. Nick Winter [person] (Executive)
1084. Nicole Alvarez [person] (Organizer)
1085. Nikki Sun [person] (Researcher)
1086. Nik Samoylov [person] (Researcher)
1087. Nilay Patel [person] (Journalist)
1088. Nimar Arora [person] (Executive)
1089. Niskanen Center [organization] (Think Tank/Policy Org)
1090. NIST AI Risk Management Framework [resource] (no category)
1091. Nitasha Tiku [person] (Journalist)
1092. Noam Chomsky [person] (Academic)
1093. NoHarm [organization] (Ethics/Bias/Rights)
1094. Nonlinear [organization] (AI Safety/Alignment)
1095. Non-Trivial [organization] (Academic)
1096. Nora Ammann [person] (Researcher)
1097. NTIA [organization] (Government/Agency)
1098. Nvidia [organization] (Infrastructure & Compute)
1099. NYS Office of Information Technology Services [organization] (Government/Agency)
1100. NYU Alignment Research Group (ARG) [organization] (Academic)
1101. NYU School of Medicine [organization] (Academic)
1102. Obsolete [resource] (no category)
1103. Odyssean Institute [organization] (Think Tank/Policy Org)
1104. OECD [organization] (Government/Agency)
1105. Office of Management and Budget [organization] (Government/Agency)
1106. Office of the Governor of Indiana [organization] (Government/Agency)
1107. Ohio Department of Job and Family Services [organization] (Government/Agency)
1108. Olga Troyanskaya [person] (Academic)
1109. Oliver Zhang [person] (Organizer)
1110. Ondřej Havlíček [person] (Researcher)
1111. On the Responsible Scaling of AI [resource] (no category)
1112. OpenAI [organization] (Frontier Lab)
1113. OpenBook [organization] (VC/Capital/Philanthropy)
1114. Open Machine [organization] (AI Safety/Alignment)
1115. Open Problems in Technical AI Governance [resource] (no category)
1116. ORCAA [organization] (Ethics/Bias/Rights)
1117. Orion AI Governance Initiative (Arcadia Impact) [organization] (Academic)
1118. Otto Barten [person] (Organizer)
1119. Ought [organization] (AI Safety/Alignment)
1120. Oxford Martin AI Governance Initiative [organization] (Academic)
1121. Oxford Martin School [organization] (Think Tank/Policy Org)
1122. Pablo Villalobos [person] (Researcher)
1123. Palantir [organization] (Deployers & Platforms)
1124. Palisade Research [organization] (AI Safety/Alignment)
1125. Palmer Luckey [person] (Executive)
1126. Pam Bondi [person] (Policymaker)
1127. Paolo Bova [person] (Researcher)
1128. Parmy Olson [person] (Journalist)
1129. Partnership on AI [organization] (Ethics/Bias/Rights)
1130. Pathfinder Fellowship (Kairos) [organization] (Academic)
1131. Pathos Consulting Group [organization] (Ethics/Bias/Rights)
1132. Patrick Collison [person] (Executive)
1133. Paul Christiano [person] (Researcher)
1134. Paul Christiano's Blog [resource] (no category)
1135. Paul Scharre [person] (Executive)
1136. PauseAI [organization] (Labor/Civil Society)
1137. Pause House [organization] (AI Safety/Alignment)
1138. PEAKS [organization] (AI Safety/Alignment)
1139. Peggy Johnson [person] (Executive)
1140. People + AI Research [organization] (Academic)
1141. Percy Liang [person] (Academic)
1142. Perplexity AI [organization] (Deployers & Platforms)
1143. Pete Buttigieg [person] (Policymaker)
1144. Peter DeSantis [person] (Executive)
1145. Peter Eckersley [person] (Organizer)
1146. Peter Favaloro [person] (Organizer)
1147. Pete Ricketts [person] (Policymaker)
1148. Peter Lee [person] (Executive)
1149. Peter McIntyre [person] (Executive)
1150. Peter Norvig [person] (Academic)
1151. Peter Thiel [person] (Investor)
1152. Peter Welch [person] (Policymaker)
1153. Peter Wildeford [person] (Executive)
1154. Philipp Hennig [person] (Academic)
1155. PIBBSS Fellowship (Principles of Intelligent Behavior in Biological and Social Systems) [organization] (Academic)
1156. Pierre Boivin [person] (Executive)
1157. Pieter Abbeel [person] (Academic)
1158. Piramidal [organization] (Deployers & Platforms)
1159. Pivotal Research Fellowship [organization] (Academic)
1160. Planned Obsolescence [resource] (no category)
1161. Platformer [resource] (no category)
1162. Platformer [organization] (Media/Journalism)
1163. Players Philanthropy Fund, Inc. [organization] (VC/Capital/Philanthropy)
1164. Plural [organization] (VC/Capital/Philanthropy)
1165. Plurality Institute [organization] (Think Tank/Policy Org)
1166. Polytechnique Montréal [organization] (Academic)
1167. Pony.ai [organization] (Deployers & Platforms)
1168. Power and Progress [resource] (no category)
1169. Pramila Jayapal [person] (Policymaker)
1170. Prasanna (Sonny) Tambe [person] (Academic)
1171. Preamble Windfall Foundation [organization] (VC/Capital/Philanthropy)
1172. President's Council of Advisors on Science and Technology (PCAST) [organization] (Government/Agency)
1173. Princeton AI Lab [organization] (Academic)
1174. Princeton CITP [organization] (Academic)
1175. Princeton University [organization] (Academic)
1176. Priya Donti [person] (Academic)
1177. Probably Good [organization] (Labor/Civil Society)
1178. Protocol Labs [organization] (VC/Capital/Philanthropy)
1179. Public AI [organization] (Think Tank/Policy Org)
1180. Public AI Network [organization] (Think Tank/Policy Org)
1181. Public First Action [organization] (Political Campaign/PAC)
1182. Public Interest Technology University Network [organization] (Academic)
1183. Public Investment Fund [organization] (VC/Capital/Philanthropy)
1184. Pulitzer Center [organization] (Media/Journalism)
1185. Qualcomm [organization] (Infrastructure & Compute)
1186. Quantexa [organization] (Deployers & Platforms)
1187. Quantified Uncertainty Research Institute (QURI) [organization] (AI Safety/Alignment)
1188. Quartz [organization] (Media/Journalism)
1189. QuitGPT [organization] (Labor/Civil Society)
1190. Rachel Freedman [person] (Researcher)
1191. Radha Plumb [person] (Policymaker)
1192. Radical AI [organization] (Deployers & Platforms)
1193. RadicalxChange [organization] (Think Tank/Policy Org)
1194. RAISE Act [resource] (no category)
1195. RAISEimpact [organization] (AI Safety/Alignment)
1196. Ramin Toloui [person] (Academic)
1197. RAND Center on AI, Security, and Technology [organization] (Think Tank/Policy Org)
1198. RAND Corporation [organization] (Think Tank/Policy Org)
1199. Randi Weingarten [person] (Organizer)
1200. Rational Animations [resource] (no category)
1201. Raymond Douglas [person] (Researcher)
1202. Real Ventures [organization] (VC/Capital/Philanthropy)
1203. Rebecca Finlay [person] (Organizer)
1204. Rebecca Scholefield [person] (Researcher)
1205. Recoding America [resource] (no category)
1206. Reddit [organization] (Media/Journalism)
1207. Rediet Abebe [person] (Academic)
1208. Redwood Research [organization] (AI Safety/Alignment)
1209. Reed Albergotti [person] (Journalist)
1210. Refik Anadol [person] (Cultural figure)
1211. Regina Barzilay [person] (Academic)
1212. Reid Hoffman [person] (Investor)
1213. Remco Zwetsloot [person] (Researcher)
1214. Remmelt Ellen [person] (Organizer)
1215. Renan Araujo [person] (Organizer)
1216. Rene Haas [person] (Executive)
1217. Ren Zhengfei [person] (Executive)
1218. Republican Party [organization] (Political Campaign/PAC)
1219. Responsible AI Initiative [organization] (AI Safety/Alignment)
1220. Rethink Priorities [organization] (Think Tank/Policy Org)
1221. Rethink Wellbeing [organization] (AI Safety/Alignment)
1222. Reuters [organization] (Media/Journalism)
1223. Reva Schwartz [person] (Researcher)
1224. Richard Blumenthal [person] (Policymaker)
1225. Richard M. Locke [person] (Academic)
1226. Richard Phillips [person] (Executive)
1227. Richard Zemel [person] (Academic)
1228. Rick Rubin [person] (Cultural figure)
1229. RiesgosIA.org [resource] (no category)
1230. Rising Tide [resource] (no category)
1231. Robert Huben [person] (Researcher)
1232. Robert J. Jones [person] (Academic)
1233. Robert Kralisch [person] (Organizer)
1234. Robert Long [person] (Researcher)
1235. Robert M. Groves [person] (Academic)
1236. Robert Miles [resource] (no category)
1237. Roberto Rigobon [person] (Academic)
1238. Robert Trager [person] (Academic)
1239. Rob Fergus [person] (Researcher)
1240. Rob Goldstein [person] (Executive)
1241. Rob Jenks [person] (Executive)
1242. Rob Portman [person] (Policymaker)
1243. Rodney Brooks [person] (Academic)
1244. Roger Grosse [person] (Academic)
1245. Roger Wicker [person] (Policymaker)
1246. Rohin Shah [person] (Researcher)
1247. Rokas Gipiškis [person] (Researcher)
1248. Ro Khanna [person] (Policymaker)
1249. Roman Yampolskiy [person] (Academic)
1250. Romeo Dean [person] (Researcher)
1251. Ron DeSantis [person] (Policymaker)
1252. Ron Wyden [person] (Policymaker)
1253. Roosevelt Institute [organization] (Think Tank/Policy Org)
1254. Ruairí Donnelly [person] (Investor)
1255. Rubina Fillion [person] (Journalist)
1256. Rudolf Laine [person] (Executive)
1257. Ruha Benjamin [person] (Academic)
1258. Rumman Chowdhury [person] (Researcher)
1259. Ryan Calo [person] (Academic)
1260. Ryan Greenblatt [person] (Researcher)
1261. Saad Siddiqui [person] (Researcher)
1262. Sacks federal preemption EO (Dec 2025) [resource] (no category)
1263. Safe AI Forum [organization] (AI Safety/Alignment)
1264. SaferAI [organization] (Think Tank/Policy Org)
1265. Safe Superintelligence Inc. [organization] (Frontier Lab)
1266. Saffron Huang [person] (Researcher)
1267. Safiya Noble [person] (Academic)
1268. SAG-AFTRA [organization] (Labor/Civil Society)
1269. Saïd Business School [organization] (Academic)
1270. Saikat Chakrabarti [person] (Policymaker)
1271. Sakana AI [organization] (Frontier Lab)
1272. Salesforce [organization] (Deployers & Platforms)
1273. Sam Altman [person] (Executive)
1274. Samantha Bradshaw [person] (Academic)
1275. Samaya AI [organization] (AI Safety/Alignment)
1276. Sam Bowman [person] (Researcher)
1277. Sam Lessin [person] (Investor)
1278. Sam McCandlish [person] (Researcher)
1279. Sam Rodriques [person] (Executive)
1280. Samuel Martin [person] (Researcher)
1281. Sandy Pentland [person] (Academic)
1282. Sanjeev Arora [person] (Academic)
1283. Santiago Rodriguez [person] (Investor)
1284. Sarah Friar [person] (Executive)
1285. Sarah Myers West [person] (Researcher)
1286. Satya Nadella [person] (Executive)
1287. Saving Humanity from Homo Sapiens (SHfHS) [organization] (VC/Capital/Philanthropy)
1288. Sayash Kapoor [person] (Academic)
1289. SB 1047 (CA, vetoed) [resource] (no category)
1290. SB 53 (CA) [resource] (no category)
1291. Scale AI [organization] (Deployers & Platforms)
1292. Scaling Laws for Neural Language Models [resource] (no category)
1293. Schmidt Futures [organization] (VC/Capital/Philanthropy)
1294. Science of Trustworthy AI (Schmidt Sciences) [organization] (VC/Capital/Philanthropy)
1295. Scott Aaronson [person] (Academic)
1296. Scott Alexander [person] (Researcher)
1297. Scott Strobel [person] (Academic)
1298. Scott Wiener [person] (Policymaker)
1299. Scott Wisor [person] (Organizer)
1300. Sean McGarvey [person] (Organizer)
1301. Seán Ó hÉigeartaigh [person] (Researcher)
1302. Sean White [person] (Executive)
1303. Sebastian Thrun [person] (Academic)
1304. Secure AI Project [organization] (Think Tank/Policy Org)
1305. Secure AI Project bills tracker [resource] (no category)
1306. Secure AI Project state bill tracker [resource] (no category)
1307. SecureBio [organization] (Think Tank/Policy Org)
1308. Semafor [organization] (Media/Journalism)
1309. Senate AI Caucus [organization] (Government/Agency)
1310. Senate AI Working Group [organization] (Government/Agency)
1311. Senate Commerce Committee (AI jurisdiction) [organization] (Government/Agency)
1312. Senate Commerce, Science, and Transportation Committee [organization] (Government/Agency)
1313. Senate Committee on Commerce, Science and Transportation [organization] (Government/Agency)
1314. Senate Committee on Homeland Security and Governmental Affairs [organization] (Government/Agency)
1315. Senate Judiciary written testimony - Helen Toner 2024-09-17 [resource] (no category)
1316. Seoul National University [organization] (Academic)
1317. Sequoia Capital [organization] (VC/Capital/Philanthropy)
1318. SERI-MATS [organization] (AI Safety/Alignment)
1319. Serkan Piantino [person] (Executive)
1320. ServiceNow [organization] (Deployers & Platforms)
1321. Seth Rosenberg [person] (Investor)
1322. Shakir Mohamed [person] (Researcher)
1323. Shalini Kantayya [person] (Cultural figure)
1324. Shane Legg [person] (Executive)
1325. Shelley Moore Capito [person] (Policymaker)
1326. Sherry Turkle [person] (Academic)
1327. Shield AI [organization] (Deployers & Platforms)
1328. Shirin Ghaffary [person] (Journalist)
1329. Shoshana Zuboff [person] (Academic)
1330. Sid Black [person] (Researcher)
1331. Sigal Samuel [person] (Journalist)
1332. Signal [organization] (Ethics/Bias/Rights)
1333. Siliconversations [resource] (no category)
1334. Siméon Campos [person] (Organizer)
1335. Simon Institute for Longterm Governance [organization] (Think Tank/Policy Org)
1336. Simon Johnson [person] (Academic)
1337. Simplex [organization] (AI Safety/Alignment)
1338. Sinan Aral [person] (Academic)
1339. Singapore AI Safety Hub [organization] (AI Safety/Alignment)
1340. Singapore Management University [organization] (Academic)
1341. Situational Awareness [resource] (no category)
1342. Slow Ventures [organization] (VC/Capital/Philanthropy)
1343. Small Business Administration [organization] (Government/Agency)
1344. Sneha Revanur [person] (Organizer)
1345. Social Media Victims Law Center [organization] (Labor/Civil Society)
1346. SoftBank [organization] (VC/Capital/Philanthropy)
1347. Softmax [organization] (AI Safety/Alignment)
1348. Some Talent Needs in AI Governance [resource] (no category)
1349. Sonya Huang [person] (Investor)
1350. Søren Elverlin [person] (Organizer)
1351. SpaceX [organization] (Infrastructure & Compute)
1352. Special Competitive Studies Project [organization] (Think Tank/Policy Org)
1353. Species [resource] (no category)
1354. Speed School of Engineering [organization] (Academic)
1355. Spencer Cox [person] (Policymaker)
1356. Splice [organization] (Deployers & Platforms)
1357. Sriram Krishnan [person] (Policymaker)
1358. Stability AI [organization] (Frontier Lab)
1359. Stacey Svetlichnaya [person] (Executive)
1360. Stanford Artificial Intelligence Laboratory (SAIL) [organization] (Academic)
1361. Stanford Center for AI Safety [organization] (AI Safety/Alignment)
1362. Stanford CRFM [organization] (Academic)
1363. Stanford Digital Economy Lab [organization] (Academic)
1364. Stanford HAI [organization] (Academic)
1365. Stanford Law School [organization] (Academic)
1366. Stanford RegLab [organization] (Academic)
1367. Stanford SIEPR [organization] (Academic)
1368. Stanford University [organization] (Academic)
1369. Stanford Vision and Learning Lab [organization] (Academic)
1370. Statement on AI Risk [resource] (no category)
1371. State of California [organization] (Government/Agency)
1372. State of Colorado [organization] (Government/Agency)
1373. State of New York [organization] (Government/Agency)
1374. State of Ohio [organization] (Government/Agency)
1375. State of Texas [organization] (Government/Agency)
1376. Stefano Mazzocchi [person] (Policymaker)
1377. Stefan Torges [person] (Organizer)
1378. Stephen Clare [person] (Researcher)
1379. Steve Byrnes's Brain-Like AGI Safety [organization] (AI Safety/Alignment)
1380. Steve Huffman [person] (Executive)
1381. Steve Omohundro [person] (Researcher)
1382. Steve Padilla [person] (Policymaker)
1383. Steve Scalise [person] (Policymaker)
1384. Stochastic Parrots Paper [resource] (no category)
1385. Stony Brook University [organization] (Academic)
1386. Stop AGI [organization] (Labor/Civil Society)
1387. Stop AI [organization] (Labor/Civil Society)
1388. Stripe [organization] (Deployers & Platforms)
1389. Strive Masiyiwa [person] (Executive)
1390. Stuart Russell [person] (Academic)
1391. Submit Test XYZ [person] (no category)
1392. Successif [organization] (Labor/Civil Society)
1393. Suhas Subramanyam [person] (Policymaker)
1394. Summer Lee [person] (Policymaker)
1395. Sundar Pichai [person] (Executive)
1396. SUNY [organization] (Academic)
1397. SUNY Albany [organization] (Academic)
1398. Superintelligence: Paths, Dangers, Strategies [resource] (no category)
1399. Superlinear Prizes [organization] (VC/Capital/Philanthropy)
1400. Supervised Program for Alignment Research (SPAR) [organization] (Academic)
1401. Suresh Venkatasubramanian [person] (Academic)
1402. Surge AI [organization] (Deployers & Platforms)
1403. Survival and Flourishing Fund [organization] (VC/Capital/Philanthropy)
1404. Survival & Flourishing Fund [organization] (VC/Capital/Philanthropy)
1405. Susan Athey [person] (Academic)
1406. SV Angel [organization] (VC/Capital/Philanthropy)
1407. Sven Herrmann [person] (Researcher)
1408. Swami Sivasubramanian [person] (Executive)
1409. Swati Gupta [person] (Academic)
1410. Taiwan Ministry of Digital Affairs [organization] (Government/Agency)
1411. Talos Fellowship (Talos Network) [organization] (Think Tank/Policy Org)
1412. Tamay Besiroglu [person] (Researcher)
1413. Tan Zhi Xuan [person] (Academic)
1414. Tarbell Center for AI Journalism [organization] (Media/Journalism)
1415. Tareq Amin [person] (Executive)
1416. Tarun Chhabra [person] (Executive)
1417. Team Shard [organization] (AI Safety/Alignment)
1418. Tech Justice Law Project [organization] (Labor/Civil Society)
1419. Technical Alignment Research Accelerator (TARA) [organization] (Academic)
1420. Technische Universität Berlin [organization] (Academic)
1421. Techno-Optimist Manifesto [resource] (no category)
1422. Ted Budd [person] (Policymaker)
1423. Ted Chiang [person] (Cultural figure)
1424. Ted Cruz [person] (Policymaker)
1425. Ted Lieu [person] (Policymaker)
1426. Tejas N. Narechania [person] (Academic)
1427. Tesla [organization] (Deployers & Platforms)
1428. The Adolescence of Technology [resource] (no category)
1429. The AI Index Report 2024 [resource] (no category)
1430. The AI Policy Network [organization] (Think Tank/Policy Org)
1431. The AI Policy Podcast [resource] (no category)
1432. The AI Risk Network [resource] (no category)
1433. The AI Whistleblower Initiative (AIWI) [organization] (Labor/Civil Society)
1434. The Alignment Problem [resource] (no category)
1435. The Alliance for Secure AI Action [organization] (AI Safety/Alignment)
1436. The American Scholar [organization] (Media/Journalism)
1437. The Annual AI Governance Report 2025 [resource] (no category)
1438. The Annual AI Governance Report 2025: Steering the Future of AI [resource] (no category)
1439. The Assistant Axis: Situating and Stabilizing the Character of LLMs [resource] (no category)
1440. The Building Capacity Blog [resource] (no category)
1441. The Cognitive Revolution [resource] (no category)
1442. The Compendium [organization] (AI Safety/Alignment)
1443. The Department of Linguistics [organization] (Academic)
1444. The Entrepreneurial State [resource] (no category)
1445. The Federal AI Preemption Push: President Trump signs the Executive Order titled “Ensuring a National Policy Framework for Artificial Intelligence” [resource] (no category)
1446. The Federal AI Preemption Push: President Trump Signs The Executive Order Titled "Ensuring A National Policy Framework For Artificial Intelligence" - New Technology - United States [resource] (no category)
1447. The Future Society [organization] (Think Tank/Policy Org)
1448. The Hastings Center [organization] (Think Tank/Policy Org)
1449. Theia Vogel [person] (Researcher)
1450. The Internet Con [resource] (no category)
1451. The Leadership Conference on Civil and Human Rights [organization] (Ethics/Bias/Rights)
1452. The Left is Missing Out on AI [resource] (no category)
1453. The Midas Project [organization] (AI Safety/Alignment)
1454. The Navigation Fund [organization] (VC/Capital/Philanthropy)
1455. The New York Times [organization] (Media/Journalism)
1456. Thenkurussi (Kesh) Kesavadas [person] (Academic)
1457. The Operating Group [organization] (VC/Capital/Philanthropy)
1458. The Persona Selection Model: Why AI Assistants Might Behave Like Humans [resource] (no category)
1459. The Power Law [resource] (no category)
1460. The Precipice: Existential Risk and the Future of Humanity [resource] (no category)
1461. The Princeton Laboratory for Artificial Intelligence [organization] (Academic)
1462. The Simple Macroeconomics of AI [resource] (no category)
1463. The Urgency of Interpretability [resource] (no category)
1464. The Verge [organization] (Media/Journalism)
1465. The Washington Post [organization] (Media/Journalism)
1466. Thierry Breton [person] (Policymaker)
1467. Think Big [organization] (Political Campaign/PAC)
1468. Thinking Machines Lab [organization] (Frontier Lab)
1469. Thomas Larsen [person] (Researcher)
1470. Thomas Umberg [person] (Policymaker)
1471. Thomas Woodside [person] (Organizer)
1472. Thom Tillis [person] (Policymaker)
1473. Thore Graepel [person] (Researcher)
1474. Threading the Needle [resource] (no category)
1475. Thrive Capital [organization] (VC/Capital/Philanthropy)
1476. Thrive Holdings [organization] (VC/Capital/Philanthropy)
1477. TikTok [organization] (Deployers & Platforms)
1478. Timaeus [organization] (AI Safety/Alignment)
1479. Time (AI coverage) [organization] (Media/Journalism)
1480. TIME Magazine [organization] (Media/Journalism)
1481. Timnit Gebru [person] (Organizer)
1482. Timothée Lacroix [person] (Researcher)
1483. Tim Wu [person] (Academic)
1484. Toby Ord [person] (Academic)
1485. Todd Young [person] (Policymaker)
1486. Tolga Bilge [person] (Researcher)
1487. Tom Brown [person] (Researcher)
1488. Tom Cotton [person] (Policymaker)
1489. Tom Davidson [person] (Researcher)
1490. Tom DiNapoli [person] (Policymaker)
1491. Tomek Korbak [person] (Researcher)
1492. Tom Griffiths [person] (Academic)
1493. Tom Kalil [person] (Executive)
1494. Tommy Shaffer Shane [person] (Organizer)
1495. Tom Sell [person] (Policymaker)
1496. Tools for Humanity [organization] (Deployers & Platforms)
1497. Toward A National AI Framework: The Federal Strategy To Override State Regulation - New Technology - United States [resource] (no category)
1498. Trail of Bits [organization] (AI Safety/Alignment)
1499. Training Language Models to Follow Instructions with Human Feedback [resource] (no category)
1500. Trajectory Labs [organization] (AI Safety/Alignment)
1501. Transcript: Joint Hearing on “Artificial Intelligence and Its Potential to Fuel Economic Growth and Improve Governance” | TechPolicy.Press [resource] (no category)
1502. Transcript: Senate Judiciary Subcommittee Hosts Hearing on Oversight of AI: Insiders’ Perspectives | TechPolicy.Press [resource] (no category)
1503. Transcript: US House Subcommittee Hosts Hearing on "AI ... [resource] (no category)
1504. Transcript: US Senate Subcommittee Hearing on "Protecting Consumers from Artificial Intelligence Enabled Fraud and Scams" | TechPolicy.Press [resource] (no category)
1505. Transformative Futures Institute [organization] (Think Tank/Policy Org)
1506. Transformer [resource] (no category)
1507. Transformer (newsletter) [organization] (Media/Journalism)
1508. Transluce [organization] (AI Safety/Alignment)
1509. Trevor Darrell [person] (Academic)
1510. Tristan Cook [person] (Executive)
1511. Tristan Harris [person] (Organizer)
1512. Trump administration [organization] (Government/Agency)
1513. Trump AI Action Plan (July 2025) [resource] (no category)
1514. Trump Attempts to Preempt State AI Regulation Through Executive Order [resource] (no category)
1515. Trump signs executive order blocking states from enforcing their own regulations around AI | CNN Business [resource] (no category)
1516. Trust::Data Alliance [organization] (AI Safety/Alignment)
1517. TruthfulAI [organization] (AI Safety/Alignment)
1518. Tryolabs [organization] (Deployers & Platforms)
1519. Tsinghua University (Institute for AI International Governance & Center for AI Governance) [organization] (Academic)
1520. TSMC [organization] (Infrastructure & Compute)
1521. Tulane University [organization] (Academic)
1522. UC Berkeley [organization] (Academic)
1523. UChicago Existential Risk Laboratory (XLab) [organization] (Academic)
1524. UCLA [organization] (Academic)
1525. UK AI Security Institute [organization] (Government/Agency)
1526. UK government's Frontier AI Taskforce [organization] (Government/Agency)
1527. UNESCO [organization] (Government/Agency)
1528. United Nations [organization] (Government/Agency)
1529. United States Senate [organization] (Government/Agency)
1530. Unitree Robotics [organization] (Deployers & Platforms)
1531. Universidad de Buenos Aires [organization] (Academic)
1532. Université de Montréal [organization] (Academic)
1533. University at Buffalo [organization] (Academic)
1534. University College London [organization] (Academic)
1535. University of California, Los Angeles [organization] (Academic)
1536. University of California, San Francisco [organization] (Academic)
1537. University of Cambridge [organization] (Academic)
1538. University of Louisville [organization] (Academic)
1539. University of Melbourne [organization] (Academic)
1540. University of Michigan [organization] (Academic)
1541. University of North Carolina system [organization] (Academic)
1542. University of Notre Dame [organization] (Academic)
1543. University of Oxford [organization] (Academic)
1544. University of Pennsylvania [organization] (Academic)
1545. University of Pittsburgh [organization] (Academic)
1546. University of Tennessee [organization] (Academic)
1547. University of Toronto [organization] (Academic)
1548. University of Tuebingen [organization] (Academic)
1549. University of Utah [organization] (Academic)
1550. University of Virginia [organization] (Academic)
1551. University of Washington [organization] (Academic)
1552. UNSG's AI Advisory Body [organization] (Think Tank/Policy Org)
1553. Upgradable [organization] (Labor/Civil Society)
1554. US AI Safety Institute Consortium [organization] (Government/Agency)
1555. U.S. Army [organization] (Government/Agency)
1556. U.S. Artificial Intelligence Safety Institute [organization] (Government/Agency)
1557. USC [organization] (Academic)
1558. USC Center for AI in Society [organization] (Academic)
1559. USC Marshall School of Business [organization] (Academic)
1560. USC School of Advanced Computing [organization] (Academic)
1561. USC Suzanne Dworak-Peck School of Social Work [organization] (Academic)
1562. USC Viterbi School of Engineering [organization] (Academic)
1563. U.S. Department of Labor [organization] (Government/Agency)
1564. U.S. Department of State [organization] (Government/Agency)
1565. U.S. Department of Transportation [organization] (Government/Agency)
1566. U.S. House of Representatives [organization] (Government/Agency)
1567. U.S. National Science Foundation [organization] (Government/Agency)
1568. U.S. Senate Commerce Committee [organization] (Government/Agency)
1569. US Senate Hearing On 'Examining the Harm of AI Chatbots' [resource] (no category)
1570. UVA Information Technology Services [organization] (Academic)
1571. UW Tech Policy Lab [organization] (Academic)
1572. Valerie Foushee [person] (Policymaker)
1573. Valérie Pisano [person] (Executive)
1574. Valerie Wirtschafter [person] (Researcher)
1575. Values in the Wild [resource] (no category)
1576. Vanderbilt University [organization] (Academic)
1577. Veena Dubal [person] (Academic)
1578. Victoria Krakovna's Blog [resource] (no category)
1579. Viktoriya Krakovna [person] (Researcher)
1580. Vincent Conitzer [person] (Academic)
1581. Vinod Khosla [person] (Investor)
1582. Virginia Eubanks [person] (Academic)
1583. Vishal Maini [person] (Investor)
1584. Vista Institute for AI Policy [organization] (Think Tank/Policy Org)
1585. Vivek Chilukuri [person] (Researcher)
1586. Vox Media [organization] (Media/Journalism)
1587. Wall Street Journal [organization] (Media/Journalism)
1588. Walter Isaacson [person] (Cultural figure)
1589. Walter Laurito [person] (Researcher)
1590. Wang Xingxing [person] (Executive)
1591. Weizenbaum Institute [organization] (Academic)
1592. Wharton School [organization] (Academic)
1593. WhiteBox Research [organization] (AI Safety/Alignment)
1594. White House [organization] (Government/Agency)
1595. White House Issues "One Rule" Executive Order To Curb State AI Regulation - New Technology - United States [resource] (no category)
1596. White House Office of Science and Technology Policy (OSTP) [organization] (Government/Agency)
1597. Why AI Will Save the World [resource] (no category)
1598. Wichita State University [organization] (Academic)
1599. Wild Dolphin Project [organization] (Academic)
1600. William and Flora Hewlett Foundation [organization] (VC/Capital/Philanthropy)
1601. William Bialek [person] (Academic)
1602. William Kimmitt [person] (Policymaker)
1603. William MacAskill [person] (Researcher)
1604. Will Knight [person] (Journalist)
1605. Windfall Trust [organization] (Think Tank/Policy Org)
1606. Wired [organization] (Media/Journalism)
1607. Woodrow Hartzog [person] (Academic)
1608. Workera [organization] (Deployers & Platforms)
1609. Workshop Labs [organization] (AI Safety/Alignment)
1610. World Economic Forum [organization] (Think Tank/Policy Org)
1611. World Labs [organization] (Frontier Lab)
1612. Writers Guild of America [organization] (Labor/Civil Society)
1613. X [organization] (Deployers & Platforms)
1614. xAI [organization] (Frontier Lab)
1615. Yale Center for Research Computing [organization] (Infrastructure & Compute)
1616. Yale Law School [organization] (Academic)
1617. Yale University [organization] (Academic)
1618. Yann LeCun [person] (Researcher)
1619. Y Combinator [organization] (VC/Capital/Philanthropy)
1620. Yejin Choi [person] (Academic)
1621. Ylli Bajraktari [person] (Executive)
1622. Yolanda Gil [person] (Academic)
1623. Yoshua Bengio [person] (Academic)
1624. Yossi Matias [person] (Executive)
1625. Yuval Noah Harari [person] (Cultural figure)
1626. Yvette Clarke [person] (Policymaker)
1627. Zach Seward [person] (Executive)
1628. Zeynep Tufekci [person] (Academic)
1629. Zico Kolter [person] (Academic)
1630. Zoë Hitzig [person] (Researcher)
1631. Zoe Lofgren [person] (Policymaker)
1632. Zoe Williams [person] (Executive)
1633. Zoey Tseng [person] (Organizer)
1634. Zvi Mowshowitz [person] (Researcher)
1635. Zvi Mowshowitz AI Newsletter [resource] (no category)
