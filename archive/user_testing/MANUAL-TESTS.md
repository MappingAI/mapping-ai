# Manual User Flow Tests

Real user journeys through the contribute form. Each test is a complete flow from start to finish.

**Test URL:** https://mapping-ai.org/contribute

---

## How to Run These Tests

1. Open Dev Tools > Network tab before starting
2. Follow the flow exactly as written
3. Note where it breaks (if it does)
4. Screenshot any errors
5. Copy the Network request/response for failed submissions

---

## Flow 1: "I want to add myself to the map"

**Persona:** AI researcher who wants to be listed

1. Go to mapping-ai.org/contribute
2. Enter password, click Submit
3. "Person" tab should already be selected
4. Click "I am this person" pill
5. Enter your name: "Test User"
6. Enter title: "AI Safety Researcher"
7. Search for primary org: type "Anthropic"
8. Select "Anthropic" from dropdown
9. Select category: "Researcher"
10. In Notes, write: "I work on AI alignment at @Anthropic, focusing on interpretability research."
    - When you type @, the mention dropdown should appear
    - Select Anthropic from the dropdown
11. Select regulatory stance: "Moderate"
12. Enter your email
13. Click "Submit Person"

**Expected:** Success message appears, form clears

**Record:**
- [ ] Pass / Fail
- Browser: ___________
- Device: ___________
- Where it broke (if failed): ___________
- Error message (if any): ___________
- Network response code: ___________

---

## Flow 2: "I want to add someone I know"

**Persona:** Policy staffer adding their boss

1. Go to contribute page, unlock with password
2. Click "Person" tab
3. Click "I can connect you" pill
4. Enter name: "Jane Smith"
5. Enter title: "Chief of Staff, Senate AI Caucus"
6. In Primary Org, type "United States Senate"
   - If not found, click "Add 'United States Senate' as new org"
   - Fill org panel: Name prefilled, Category = "Government/Agency"
   - Click Submit in panel
   - Panel should close and link org to the field
7. Select category: "Policymaker"
8. Add location: type "Washington" and select "Washington, D.C."
9. In Notes, write: "Jane leads Senator X's AI policy team. She drafted the AI Accountability Act and coordinates with @NIST on safety standards."
10. Select influence type: "Decision-maker" and "Advisor/strategist"
11. Enter your email
12. Click "Submit Person"

**Expected:** Success message appears

**Record:**
- [ ] Pass / Fail
- Browser: ___________
- Device: ___________
- Where it broke (if failed): ___________

---

## Flow 3: "I want to add a new AI company"

**Persona:** Tech journalist adding a startup

1. Go to contribute page, unlock with password
2. Click "Organization" tab
3. Click "Someone I know of" pill
4. Enter name: "AI Startup Inc"
5. Enter website: "https://aistartup.example.com"
6. Select category: "Frontier Lab"
7. In Parent Org, search "Y Combinator"
   - Select from dropdown (or add if not found)
8. Select funding model: "Venture-backed"
9. Add location: "San Francisco, CA"
10. In Notes, write: "Founded in 2024, AI Startup Inc is building foundation models for scientific research. They raised a $50M Series A from @Sequoia Capital."
11. Select regulatory stance: "Light-touch"
12. Enter Twitter handle: "@aistartup"
13. Enter your email
14. Click "Submit Organization"

**Expected:** Success message appears

**Record:**
- [ ] Pass / Fail
- Browser: ___________
- Device: ___________
- Where it broke (if failed): ___________

---

## Flow 4: "I want to add an influential paper"

**Persona:** Grad student adding a seminal paper

1. Go to contribute page, unlock with password
2. Click "Resource" tab
3. Enter title: "Constitutional AI: Harmlessness from AI Feedback"
4. Enter URL: "https://arxiv.org/abs/2212.08073"
5. In Author field, type "Yuntao Bai"
   - If found, select from dropdown
   - If not found, leave as text
6. Select resource type: "Academic Paper"
7. Select resource category: "AI Safety"
8. Enter year: "2022"
9. In Key Argument, write: "Introduces RLHF alternative using AI feedback for alignment, reducing reliance on human labelers."
10. In Notes, write: "This paper from @Anthropic introduced Constitutional AI, which has become a standard technique for aligning language models."
11. Enter your email
12. Click "Submit Resource"

**Expected:** Success message appears

**Record:**
- [ ] Pass / Fail
- Browser: ___________
- Device: ___________
- Where it broke (if failed): ___________

---

## Flow 5: "I want to update an existing person's info"

**Persona:** Someone who notices outdated info

1. Go to contribute page, unlock with password
2. Click "Person" tab
3. In the Name field, type "Sam Altman"
4. Existing entry sidebar should appear on the right
5. Click on the existing Sam Altman entry
6. Form should switch to "Update mode" with banner showing
7. Update the title field to something new
8. Add a note about a recent event: "In 2024, Sam testified before Congress on AI regulation."
9. Enter your email
10. Click "Submit Person"

**Expected:** Success message, submission is an update not a new entry

**Record:**
- [ ] Pass / Fail
- Browser: ___________
- Device: ___________
- Where it broke (if failed): ___________

---

## Flow 6: "I'm on my phone and want to quickly add someone"

**Persona:** Conference attendee adding a speaker they just saw

1. On mobile phone, go to contribute page
2. Enter password (test: does keyboard cover the field?)
3. Tap "Person" tab
4. Tap "Someone I know of" pill
5. Enter name: "Conference Speaker"
6. Enter title: "VP of AI Policy, Big Tech Co"
7. Tap Primary Org field, type "Google"
8. Tap to select from dropdown (test: is dropdown usable on touch?)
9. Scroll down to Notes field
10. Type a brief note with @mention:
    - Type "@Goo" - does mention dropdown appear on mobile?
    - Can you tap to select?
11. Scroll to email, enter it
12. Tap Submit

**Expected:** Works smoothly on mobile, success message

**Record:**
- [ ] Pass / Fail
- Phone model: ___________
- Browser: ___________
- Where it broke (if failed): ___________
- Specific mobile issues: ___________

---

## Flow 7: "I started filling out the form but got interrupted"

**Persona:** Someone who gets distracted mid-form

1. Go to contribute page, unlock with password
2. Start filling Person form:
   - Name: "Interrupted Test"
   - Title: "Some Title"
   - Write something in Notes
3. **Close the browser tab** (don't submit)
4. Wait 30 seconds
5. Open contribute page again in new tab
6. Unlock with password

**Expected:** Form should restore your draft data

**Record:**
- [ ] Pass / Fail
- Browser: ___________
- Was data restored?: ___________

---

## Flow 8: "I want to add multiple orgs as affiliations"

**Persona:** Adding someone with multiple affiliations

1. Go to contribute page, unlock with password
2. Click "Person" tab
3. Enter name: "Multi-Affiliation Person"
4. Search Primary Org: "Stanford University", select it
5. In "Other Organizations" field:
   - Type "OpenAI", select from dropdown
   - Type "Anthropic", select from dropdown
   - Type "RAND Corporation", select from dropdown
6. All three should appear as tags
7. Remove one by clicking X
8. Enter remaining required fields
9. Enter email
10. Submit

**Expected:** All affiliations saved correctly

**Record:**
- [ ] Pass / Fail
- Browser: ___________
- Where it broke (if failed): ___________

---

## Flow 9: "The org I'm looking for doesn't exist"

**Persona:** Adding someone at a new/small org

1. Go to contribute page, unlock with password
2. Click "Person" tab
3. Enter name: "New Org Employee"
4. In Primary Org, type "Tiny AI Lab That Doesn't Exist"
5. No results should appear
6. Click "Add 'Tiny AI Lab That Doesn't Exist' as new org..."
7. Org panel slides in with name pre-filled
8. Fill out org details:
   - Category: "AI Safety/Alignment"
   - Website: "https://tinyailab.org"
   - Location: "Boston, MA"
9. Click Submit in the org panel
10. Panel should close, org should link to Primary Org field
11. Continue filling person form
12. Submit person

**Expected:** Both org and person submit successfully

**Record:**
- [ ] Pass / Fail
- Browser: ___________
- Where it broke (if failed): ___________
- Did org panel work?: ___________
- Did org link back to person form?: ___________

---

## Debugging Submission Failures

When a flow fails at submission, capture:

### 1. Network Request
- Open Dev Tools > Network
- Find the POST to `/submit`
- Right-click > Copy as cURL

### 2. Request Payload
- Click the request
- Go to Payload tab
- Copy the JSON

### 3. Response
- Go to Response tab
- Copy the response body
- Note the status code (200? 400? 500?)

### 4. Console Errors
- Check Console tab for red errors
- Screenshot any errors

---

## Results Summary

| Flow | Chrome Mac | Safari Mac | Firefox | iOS Safari | Android Chrome |
|------|------------|------------|---------|------------|----------------|
| 1. Add myself | | | | | |
| 2. Add someone I know | | | | | |
| 3. Add company | | | | | |
| 4. Add paper | | | | | |
| 5. Update existing | | | | | |
| 6. Mobile quick add | | | | | |
| 7. Draft restore | | | | | |
| 8. Multiple affiliations | | | | | |
| 9. Create new org inline | | | | | |

---

## Issues Found

| Date | Flow # | Browser/Device | What Happened | Network Response |
|------|--------|----------------|---------------|------------------|
| | | | | |
| | | | | |
| | | | | |
