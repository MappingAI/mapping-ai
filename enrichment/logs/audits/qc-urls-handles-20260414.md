# URL + Handle Audit — 2026-04-14

Sources: `website` + `resource_url` HEAD/GET checks; Twitter via cdn.syndication.twimg.com; Bluesky via public.api.bsky.app.

## Summary

- **URLs:** 952 checked — ok 868, redirect 0, 404 23, forbidden 30, other 8, error 23
- **Twitter:** 208 checked — valid 20, invalid 176, unknown 12
- **Bluesky:** 5 checked — valid 4, invalid 1, unknown 0

## URL Failures (404 / error / forbidden)

| id | kind | entity | status | url | note |
|---:|------|--------|-------:|-----|------|
| 565 | resource_url | Paul Christiano's Blog | None | https://ai-alignment.com/ | URLError: [SSL: CERTIFICATE_VERIFY_FAILED] certificate verif |
| 594 | resource_url | SB 53 (CA) | None | https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202520260SB | URLError: [SSL: CERTIFICATE_VERIFY_FAILED] certificate verif |
| 640 | resource_url | SB 1047 (CA, vetoed) | None | https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202320240SB | URLError: [SSL: CERTIFICATE_VERIFY_FAILED] certificate verif |
| 675 | resource_url | Alignment Pretraining: AI Discourse Caus | None | https://geodesic.ai/alignment-pretraining | URLError: timed out |
| 628 | resource_url | Chip War | 401 | https://www.christophermiller.net/semiconductors |  |
| 551 | resource_url | Stochastic Parrots Paper | 403 | https://dl.acm.org/doi/10.1145/3442188.3445922 |  |
| 561 | resource_url | DeepMind Safety Research | 403 | https://deepmindsafetyresearch.medium.com/ |  |
| 608 | resource_url | RAISE Act | 403 | https://www.nysenate.gov/legislation/bills/2025/S6953 |  |
| 620 | resource_url | Dignity in a Digital Age | 403 | https://www.simonandschuster.com/books/Dignity-in-a-Digital-Age/Ro-Khanna/978198 |  |
| 677 | resource_url | The Persona Selection Model: Why AI Assi | 403 | https://transformer-circuits.pub/2026/persona-selection |  |
| 549 | resource_url | Statement on AI Risk | 404 | https://safe.ai/statement |  |
| 550 | resource_url | NIST AI Risk Management Framework | 404 | https://nist.gov/ai-rmf |  |
| 645 | resource_url | The Urgency of Interpretability | 404 | https://www.anthropic.com/research/the-urgency-of-interpretability |  |
| 650 | resource_url | Executive Order on Safe, Secure, and Tru | 404 | https://www.whitehouse.gov/briefing-room/presidential-actions/2023/10/30/executi |  |
| 653 | resource_url | International AI Safety Report | 404 | https://www.gov.uk/government/publications/international-ai-safety-report |  |
| 655 | resource_url | The Adolescence of Technology | 404 | https://darioamodei.com/technology-adolescence |  |
| 660 | resource_url | A Collection of AI Governance Research I | 404 | https://www.governance.ai/research-paper/a-collection-of-ai-governance-research- |  |
| 667 | resource_url | Common Ground between AI 2027 & AI as No | 404 | https://aifutures.org/common-ground |  |
| 668 | resource_url | Crisp and Fuzzy Tasks | 404 | https://www.dwarkeshpatel.com/p/crisp-and-fuzzy |  |
| 676 | resource_url | Values in the Wild | 404 | https://www.anthropic.com/research/values-in-the-wild |  |
| 678 | resource_url | The Assistant Axis: Situating and Stabil | 404 | https://arxiv.org/abs/2601.assistant-axis |  |
| 679 | resource_url | Some Talent Needs in AI Governance | 404 | https://forum.effectivealtruism.org/posts/some-talent-needs-in-ai-governance |  |
| 681 | resource_url | Toward A National AI Framework: The Fede | 404 | https://dev.mondaq.com/unitedstates/new-technology/1722598/toward-a-national-ai- |  |
| 669 | resource_url | Alignment Remains a Hard, Unsolved Probl | 429 | https://www.alignmentforum.org/posts/unsolved-alignment |  |
| 153 | website | Geodesic Research | None | https://www.geodesicresearch.org/ | URLError: [Errno 8] nodename nor servname provided, or not k |
| 236 | website | Future of Humanity Institute (closed 202 | None | https://www.fhi.ox.ac.uk/ | URLError: [Errno 8] nodename nor servname provided, or not k |
| 245 | website | Data Workers' Inquiry | None | https://data-workers.org/ | URLError: timed out |
| 332 | website | AI Safety Hub | None | https://www.aisafetyhub.org/ | URLError: [Errno 8] nodename nor servname provided, or not k |
| 339 | website | Preamble Windfall Foundation | None | https://www.preambleforgood.org/ | URLError: [SSL: TLSV1_ALERT_INTERNAL_ERROR] tlsv1 alert inte |
| 426 | website | Stop AGI | None | https://stop.ai/ | URLError: [Errno 8] nodename nor servname provided, or not k |
| 723 | website | Pete Ricketts | None | ricketts.senate.gov | ValueError: unknown url type: 'ricketts.senate.gov' |
| 766 | website | IIT Madras | None | https://iitm.ac.in | URLError: [Errno 8] nodename nor servname provided, or not k |
| 820 | website | Exponential View | None | https://exponentialview.co | URLError: [SSL: TLSV1_ALERT_INTERNAL_ERROR] tlsv1 alert inte |
| 868 | website | The Washington Post | None | https://washingtonpost.com | TimeoutError: The read operation timed out |
| 1028 | website | U.S. House of Representatives | None | https://house.gov | URLError: [SSL: CERTIFICATE_VERIFY_FAILED] certificate verif |
| 1029 | website | California State Senate | None | https://senate.ca.gov | URLError: [SSL: CERTIFICATE_VERIFY_FAILED] certificate verif |
| 1044 | website | University of Virginia | None | https://virginia.edu | URLError: [SSL: CERTIFICATE_VERIFY_FAILED] certificate verif |
| 1091 | website | Wharton School | None | https://wharton.upenn.edu | URLError: timed out |
| 1159 | website | California Department of General Service | None | https://www.dgs.ca.gov | URLError: [SSL: CERTIFICATE_VERIFY_FAILED] certificate verif |
| 1249 | website | Macquarie Asset Management | None | https://www.macquarieam.com | URLError: [Errno 8] nodename nor servname provided, or not k |
| 1250 | website | AMD | None | https://www.amd.com | TimeoutError: The read operation timed out |
| 1283 | website | USC School of Advanced Computing | None | https://advancedcomputing.usc.edu | URLError: [Errno 8] nodename nor servname provided, or not k |
| 1435 | website | Collège de France | None | https://www.college-de-france.fr | URLError: [SSL: CERTIFICATE_VERIFY_FAILED] certificate verif |
| 1409 | website | Wall Street Journal | 401 | https://www.wsj.com |  |
| 210 | website | SAG-AFTRA | 403 | https://www.sagaftra.org |  |
| 309 | website | Global Partnership on AI | 403 | https://www.oecd.org/en/about/programmes/global-partnership-on-artificial-intell |  |
| 741 | website | Midjourney | 403 | https://midjourney.com |  |
| 906 | website | Data & Society | 403 | https://datasociety.net |  |
| 907 | website | Center for Democracy & Technology | 403 | https://cdt.org |  |
| 914 | website | Department of Commerce | 403 | https://commerce.gov |  |
| 1024 | website | University of Oxford | 403 | https://ox.ac.uk |  |
| 1048 | website | Columbia University | 403 | https://columbia.edu |  |
| 1068 | website | World Economic Forum | 403 | https://weforum.org |  |
| 1071 | website | Tesla | 403 | https://tesla.com |  |
| 1084 | website | University of Michigan | 403 | https://umich.edu |  |
| 1086 | website | Johns Hopkins University | 403 | https://jhu.edu |  |
| 1088 | website | American University | 403 | https://american.edu |  |
| 1093 | website | U.S. Department of Transportation | 403 | https://transportation.gov |  |
| 1221 | website | Perplexity AI | 403 | https://www.perplexity.ai |  |
| 1303 | website | Idaho National Laboratory | 403 | https://inl.gov |  |
| 1321 | website | ServiceNow | 403 | https://www.servicenow.com |  |
| 1336 | website | OECD | 403 | https://www.oecd.org |  |
| 1343 | website | Arizona Secretary of State | 403 | https://azsos.gov |  |
| 1389 | website | Harvard Faculty of Arts and Sciences | 403 | https://www.fas.harvard.edu |  |
| 1420 | website | Department of Defense | 403 | https://www.defense.gov |  |
| 1491 | website | ACM US Technology Policy Committee | 403 | https://www.acm.org/public-policy/ustpc |  |
| 1520 | website | Association for Computing Machinery | 403 | https://www.acm.org |  |
| 166 | website | Senate AI Working Group | 404 | https://www.schumer.senate.gov/newsroom/press-releases/schumer-senate-ai-working |  |
| 202 | website | Machine Learning for Alignment Bootcamp  | 404 | https://www.redwoodresearch.org/mlab |  |
| 513 | website | Machine Learning for Alignment Bootcamp | 404 | https://www.redwoodresearch.org/mlab |  |
| 1062 | website | Civic Signals | 404 | https://civicsignals.io |  |
| 1437 | website | National Artificial Intelligence Advisor | 404 | https://ai.gov/naiac |  |
| 1488 | website | National Artificial Intelligence Initiat | 404 | https://www.ai.gov/naiio |  |
| 1629 | website | US AI Safety Institute Consortium | 404 | https://www.nist.gov/aisi/artificial-intelligence-safety-institute-consortium-ai |  |
| 1790 | website | National Security Council (NSC) | 404 | https://www.whitehouse.gov/nsc/ |  |
| 1791 | website | President's Council of Advisors on Scien | 404 | https://www.whitehouse.gov/pcast/ |  |
| 1792 | website | Bureau of Cyberspace and Digital Policy  | 404 | https://www.state.gov/bureaus-offices/bureau-of-cyberspace-and-digital-policy/ |  |
| 142 | website | Cyborgism | 429 | https://www.alignmentforum.org/posts/bxt7uCiHam4QXrQAA/cyborgism |  |
| 227 | website | Manifund | 429 | https://manifund.org/ |  |
| 328 | website | Steve Byrnes's Brain-Like AGI Safety | 429 | https://www.alignmentforum.org/s/HzcM2dkCq7fwXBej8 |  |
| 333 | website | AI Alignment Forum | 429 | https://www.alignmentforum.org/ |  |
| 383 | website | AI Safety Tactical Opportunities Fund (A | 429 | https://manifund.org/JueYan |  |
| 424 | website | ML & AI Safety Updates | 429 | https://www.alignmentforum.org/posts/uRosq4YtNiZxywcAq/newsletter-for-alignment- |  |
| 478 | website | AI Safety Tactical Opportunities Fund | 429 | https://manifund.org/JueYan |  |

## Twitter Invalid

| id | entity | handle | note |
|---:|--------|--------|------|
| 247 | MIT FutureTech | @neil_t | size=2212 (likely not-found stub) |
| 281 | EA Infrastructure Fund | @EAFunds | size=2215 (likely not-found stub) |
| 95 | Meredith Whittaker | @MeredithWhittaker | size=2197 (likely not-found stub) |
| 1783 | Daniel Filan | DanielFilan | size=2227 (likely not-found stub) |
| 287 | Collective Action for Existential Safety | @ExistentialSafe | size=2239 (likely not-found stub) |
| 304 | The Midas Project | @MidasProject | size=2230 (likely not-found stub) |
| 948 | MIT GOV/LAB | @mitgovlab | size=2181 (likely not-found stub) |
| 345 | White House Office of Science and Techno | @WhiteHouseOSTP | size=2191 (likely not-found stub) |
| 362 | The AI Whistleblower Initiative (AIWI) | @aiwi_org | size=2179 (likely not-found stub) |
| 1007 | Andrej Karpathy | @karpathy | HTTP 429 |
| 341 | Machine Intelligence Research Institute  | @MaboratoryIntel | size=2193 (likely not-found stub) |
| 1006 | Marco Rubio | @marcorubio | HTTP 429 |
| 408 | Convergence Analysis | @cvganalysis | HTTP 429 |
| 433 | Centre pour la Sécurité de l'IA (CeSIA) | @securite_ia | HTTP 429 |
| 70 | Joi Ito | @Joi | HTTP 429 |
| 36 | Fran Drescher | @vocalize | HTTP 429 |
| 37 | Ro Khanna | @RepRoKhanna | HTTP 429 |
| 727 | Cloudflare | @cloudflare | HTTP 429 |
| 102 | Yejin Choi | @stanford | HTTP 429 |
| 736 | Allie K. Miller | @alliekmiller | HTTP 429 |
| 741 | Midjourney | @midjourney | HTTP 429 |
| 762 | Tryolabs | @tryolabsteam | HTTP 429 |
| 769 | World Labs | @theworldlabs | HTTP 429 |
| 746 | Arm | @Arm | HTTP 429 |
| 757 | FutureHouse | @FutureHouseSF | HTTP 429 |
| 770 | Strive Masiyiwa | @strivemasiyiwa | HTTP 429 |
| 772 | Alexandr Wang | @alexandr_wang | HTTP 429 |
| 791 | Tareq Amin | @TareqAmin_ | HTTP 429 |
| 773 | Nat Friedman | @natfriedman | HTTP 429 |
| 796 | David Ha | @hardmaru | HTTP 429 |
| 820 | Exponential View | @azeem | HTTP 429 |
| 822 | Jan Leike | @janleike | HTTP 429 |
| 823 | Chris Olah | @ch402 | HTTP 429 |
| 67 | Ezra Klein | @Zapier | HTTP 429 |
| 829 | Jack Clark | @jackclarkSF | HTTP 429 |
| 10 | Alexandria Ocasio-Cortez | @AOC | HTTP 429 |
| 797 | Edwin Chen | @echen | HTTP 429 |
| 836 | John Schulman | @johnschulman2 | HTTP 429 |
| 107 | Karen Hao | @mit | HTTP 429 |
| 854 | Elad Gil | @eladgil | HTTP 429 |
| 869 | Vox Media | @voxmedia | HTTP 429 |
| 866 | Financial Times | @FinancialTimes | HTTP 429 |
| 891 | Lex Fridman | @lexfridman | HTTP 429 |
| 886 | Kara Swisher | @karaswisher | HTTP 429 |
| 903 | Algorithmic Justice League | @AJLUNITED | HTTP 429 |
| 939 | Kate Crawford | @katecrawford | HTTP 429 |
| 901 | Liz Shuler | @lizshuler | HTTP 429 |
| 1000 | Sundar Pichai | @sundarpichai | HTTP 429 |
| 997 | Samantha Bradshaw | @sbradshaww | HTTP 429 |
| 1001 | Satya Nadella | @sataborland | HTTP 429 |
| 1003 | Aza Raskin | @aza | HTTP 429 |
| 1002 | Tristan Harris | @tristanharris | HTTP 429 |
| 1008 | Palmer Luckey | @PalmerLuckey | HTTP 429 |
| 1009 | Bill Gates | @BillGates | HTTP 429 |
| 1010 | Laurene Powell Jobs | @laurenepowell | HTTP 429 |
| 1011 | Naval Ravikant | @naval | HTTP 429 |
| 1015 | Kevin Kelly | @kevin2kelly | HTTP 429 |
| 1012 | Chris Smalls | @Shut_downAmazon | HTTP 429 |
| 1013 | Kashmir Hill | @kashmir | HTTP 429 |
| 1018 | QuitGPT | @quitgpt | HTTP 429 |
| 826 | Jason Matheny | @JasonGMatheny | HTTP 429 |
| 784 | Refik Anadol | @refikanadol | HTTP 429 |
| 828 | Remco Zwetsloot | @r_zwetsloot | HTTP 429 |
| 47 | Mark Zuckerberg | @metro | HTTP 429 |
| 876 | Thinking Machines Lab | @thinkymachines | HTTP 429 |
| 787 | Rick Rubin | @RickRubin | HTTP 429 |
| 2 | Chuck Schumer | @SenSchumer | HTTP 429 |
| 722 | Colin Allred | @colinallred | HTTP 429 |
| 1785 | Cari Tuna | carituna | HTTP 429 |
| 824 | Connor Leahy | @NPCollapse | HTTP 429 |
| 4 | Casey Newton | @CaseyNewton | HTTP 429 |
| 7 | Brian Schatz | @SenBrianSchatz | HTTP 429 |
| 12 | Anton Korinek | @akorinek | HTTP 429 |
| 13 | Daniela Amodei | @DanielaAmodei | HTTP 429 |
| 8 | Dario Amodei | @DarioAmodei | HTTP 429 |
| 231 | Center for American Progress | @amprog | HTTP 429 |
| 17 | Jared Polis | @gazette | HTTP 429 |
| 18 | Sam Altman | @sama | HTTP 429 |
| 29 | Yoshua Bengio | @Yoshua_Bengio | HTTP 429 |
| 22 | Eliezer Yudkowsky | @ESYudkowsky | HTTP 429 |
| 23 | Michel Justen | @micheljusten1 | HTTP 429 |
| 30 | Paul Christiano | @gmail | HTTP 429 |
| 26 | Simon Johnson | @baselinescene | HTTP 429 |
| 39 | Saikat Chakrabarti | @saikatc | HTTP 429 |
| 889 | Nathan Lambert | @natolambert | HTTP 429 |
| 41 | Chris Murphy | @ChrisMurphyCT | HTTP 429 |
| 42 | David Sacks | @strictlyvc | HTTP 429 |
| 54 | Mariana Mazzucato | @MazzucatoM | HTTP 429 |
| 19 | Mike Krieger | @mikekrieger | HTTP 429 |
| 48 | Elon Musk | @elonmusk | HTTP 429 |
| 55 | Fei-Fei Li | @UC | HTTP 429 |
| 52 | Daron Acemoglu | @DAcemogluMIT | HTTP 429 |
| 62 | Ed Newton-Rex | @ai | HTTP 429 |
| 57 | Sayash Kapoor | @princeton | HTTP 429 |
| 58 | Sandy Pentland | @stanford | HTTP 429 |
| 66 | Milagros Miceli | @milagrosmiceli | HTTP 429 |
| 75 | Joni Ernst | @SenJoniErnst | HTTP 429 |
| 69 | Dan Kagan-Kans | @kagankans | HTTP 429 |
| 91 | Scott Wiener | @Scott_Wiener | HTTP 429 |
| 93 | Dan Hendrycks | @DanHendrycks | HTTP 429 |
| 100 | Erik Brynjolfsson | @stanford | HTTP 429 |
| 103 | Arvind Narayanan | @cs | HTTP 429 |
| 112 | Ted Lieu | @RepTedLieu | HTTP 429 |
| 133 | Anthropic | @AnthropicAI | HTTP 429 |
| 105 | Randi Weingarten | @rweingarten | HTTP 429 |
| 124 | Brookings Institution | @BrookingsInst | HTTP 429 |
| 116 | Gavin Newsom | @GavinNewsom | HTTP 429 |
| 135 | Writers Guild of America | @WGAWest | HTTP 429 |
| 115 | Anna Eshoo | @time | HTTP 429 |
| 132 | Partnership on AI | @PartnershipAI | HTTP 429 |
| 137 | Anthropic Institute | @AnthropicAI | HTTP 429 |
| 138 | Existential Risk Observatory | @xrobservatory | HTTP 429 |
| 146 | Google DeepMind | @DeepMind | HTTP 429 |
| 140 | OpenAI | @OpenAI | HTTP 429 |
| 192 | Foresight Institute | @foresightinst | HTTP 429 |
| 173 | AI Now Institute | @ainoworg | HTTP 429 |
| 204 | Meta AI | @MetaAI | HTTP 429 |
| 177 | xAI | @xaboratory | HTTP 429 |
| 154 | AI Objectives Institute | @AIObjectives | HTTP 429 |
| 158 | Epoch AI | @EpochAI | HTTP 429 |
| 879 | Will Knight | @willknight | HTTP 429 |
| 213 | Mistral AI | @MistralAI | HTTP 429 |
| 211 | Andreessen Horowitz (a16z) | @a16z | HTTP 429 |
| 188 | AI Safety, Ethics and Society (Center fo | @safe_ai | HTTP 429 |
| 220 | Conjecture | @Conjecture_AI | HTTP 429 |
| 221 | BlueDot Impact | @bluedotimpact | HTTP 429 |
| 229 | Future of Life Institute | @FutureOfLifeOrg | HTTP 429 |
| 225 | Centre for the Governance of AI (GovAI) | @GovAI_org | HTTP 429 |
| 883 | Madhumita Murgia | @madhumita29 | HTTP 429 |
| 233 | Berggruen Institute | @BerggruenInst | HTTP 429 |
| 44 | Ben Reinhardt | @Ben_Reinhardt | HTTP 429 |
| 894 | Nathaniel Whittemore | @nlw | HTTP 429 |
| 887 | Ethan Mollick | @emollick | HTTP 429 |
| 890 | Zvi Mowshowitz | @TheZvi | HTTP 429 |
| 61 | Holden Karnofsky | @HoldenKarnofsky | HTTP 429 |
| 720 | Laurie Buckhout | @lauriebuckhout | HTTP 429 |
| 955 | EconTAI | @akorinek | HTTP 429 |
| 913 | CISA | @CISAgov | HTTP 429 |
| 895 | Sneha Revanur | @SnehaRevanur | HTTP 429 |
| 725 | Alexandra Mealer | @AlexMealer | HTTP 429 |
| 899 | Veena Dubal | @veenadubal | HTTP 429 |
| 918 | Corynne McSherry | @cmcsherr | HTTP 429 |
| 28 | Jennifer Pahlka | @pahlkadot | HTTP 429 |
| 858 | Sam Lessin | @lessin | HTTP 429 |
| 923 | Sarah Myers West | @sarahbmyers | HTTP 429 |
| 940 | Cory Doctorow | @pluralistic | HTTP 429 |
| 993 | Divya Siddarth | @dvsdivya | HTTP 429 |
| 349 | Center for Strategic and International S | @CSIS | HTTP 429 |
| 3 | Marc Andreessen | @a16z | HTTP 429 |
| 965 | Ajay Agrawal | @professor_ajay | HTTP 429 |
| 936 | Thierry Breton | @ThierryBreton | HTTP 429 |
| 994 | Audrey Tang | @audreyt | HTTP 429 |
| 40 | Pete Buttigieg | @PeteButtigieg | HTTP 429 |
| 980 | Ryan Calo | @rcalo | HTTP 429 |
| 452 | Stanford HAI | @StanfordHAI | HTTP 429 |
| 1014 | Walter Isaacson | @WalterIsaacson | HTTP 429 |
| 15 | Kim Stanley Robinson | @t | HTTP 429 |
| 43 | Tom Kalil | @Berkeley | HTTP 429 |
| 851 | Anjney Midha | @AnjneyMidha | HTTP 429 |
| 92 | Yann LeCun | @ylecun | HTTP 429 |
| 85 | Sriram Krishnan | @protonmail | HTTP 429 |
| 900 | Alex Hanna | @alexhanna | HTTP 429 |
| 850 | Martin Casado | @martin_casado | HTTP 429 |
| 825 | Helen Toner | @hlntnr | HTTP 429 |
| 853 | Seth Rosenberg | @sethgrosenberg | HTTP 429 |
| 848 | Reid Hoffman | @reidhoffman | HTTP 429 |
| 31 | Regina Barzilay | @csail | HTTP 429 |
| 714 | Valerie Foushee | @ValerieFoushee | HTTP 429 |
| 962 | David Autor | @davidautor | HTTP 429 |
| 988 | Lily Tsai | @mitgovlab | HTTP 429 |
| 11 | Marsha Blackburn | @MarshaBlackburn | HTTP 429 |
| 1005 | Ron Wyden | @RonWyden | HTTP 429 |
| 1004 | Amy Klobuchar | @amyklobuchar | HTTP 429 |
| 1 | Stuart Russell | @humancompatible | HTTP 429 |
| 82 | Ted Cruz | @tedcruz | HTTP 429 |
| 78 | John Hickenlooper | @SenatorHick | HTTP 429 |

## Twitter Unknown (check errors)

| id | entity | handle | note |
|---:|--------|--------|------|
| 298 | Humans in Control | @Unknown | placeholder |
| 355 | Krueger AI Safety Lab (KASL) | @Unknown | placeholder |
| 297 | Global AI Moratorium (GAIM) | @Unknown | placeholder |
| 344 | Public AI Network | @Unknown | placeholder |
| 401 | Pause House | @Unknown | placeholder |
| 428 | Advanced Research + Invention Agency (AR | @Unknown | placeholder |
| 131 | Center for Security and Emerging Technol | @Unknown | placeholder |
| 163 | Lionheart Ventures | @Unknown | placeholder |
| 210 | SAG-AFTRA | @Unknown | placeholder |
| 222 | Secure AI Project | @Unknown | placeholder |
| 228 | Americans for Responsible Innovation (AR | @Unknown | placeholder |
| 232 | Senate Commerce Committee (AI jurisdicti | @Unknown | placeholder |

## Bluesky

| id | entity | handle | valid | note |
|---:|--------|--------|:-----:|------|
| 6 | Dario | @darioamodei.bsky.social | True | did:plc:vldmcmkvf65p3eaymwjyelye |
| 716 | Melissa Bean | @melissabeanil.bsky.social | True | did:plc:koc66zean6iqbjvkfsnuh7w3 |
| 8 | Dario Amodei | @darioamodei.bsky.social | True | did:plc:vldmcmkvf65p3eaymwjyelye |
| 723 | Pete Ricketts | @lordrickettsp.bsky.social | True | did:plc:zzr4c4oq6ejncjuihwr5nxga |
| 725 | Alexandra Mealer | @AlexMealer.bsky.social | False | HTTP 400 |
