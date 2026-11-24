# Bond Navigator

**An AI feature that tells small contractors when to extend, reduce or release their bank guarantees, so they stop wasting money and never get caught out by an expired guarantee.**

> Student concept prototype for the Commercial Banking group project (Part II), styled after a corporate banking platform such as DBS IDEAL. Not a DBS product or website. There is no login, and all companies, projects, clauses and amounts are fictional. The forecast model is trained on synthetic data.

![Guarantee card for a performance bond that must be extended](docs/screenshot-extend.png)

## The idea in plain words

When a small contractor wins a project, the client asks for a **bank guarantee**: a letter from DBS promising to pay, say, S$480,000 if the contractor fails. While a guarantee is open, the contractor **pays DBS a fee** and it **uses up part of their borrowing limit**.

Contractors juggle many guarantees on spreadsheets, so two things go wrong:

1. **They forget to cancel guarantees they no longer need** (a lost tender, a finished project). They keep paying fees, and the blocked limit stops them bidding for new jobs.
2. **A guarantee runs out before a late project finishes.** The client says "extend it or we cash it now", and losing S$480,000 overnight can sink a small company.

Bond Navigator watches every guarantee and says what to do and when, then pre-fills the request in one click.

## What the prototype shows

| Screen | What to click |
|---|---|
| **Guarantee line** | How much of the S$2,000,000 line is used, and how much Bond Navigator can free (S$510,000 here). |
| **PB-0231 (Extend now)** | Timeline showing the bond runs out before the late project ends, a chart of payments vs plan, the contract clause read by AI, and "Why this forecast". Click **Prepare extension request**, then **Submit to DBS**. |
| **AP-0117 (Reduce)** | Only S$90,000 of a S$300,000 advance is still owed, so the bond can shrink. Opens a pre-filled letter to the client. |
| **PB-0198 and TB-1104 (Release)** | Project finished (retention paid) and tender lost (public GeBIZ notice). Both can be released. |
| **TB-1107 and PB-0240** | On track. Shows Bond Navigator does not raise false alarms. |
| **Bond type chips** | Each bond type has its own workflow and outcome. MOM security bonds are a phase 2 preview. |
| **Pilot results** | Forecast accuracy vs a plain expiry reminder, value for the client and DBS, and who pays for the AI tokens. |
| **Governance** | Kill switch (falls back to expiry reminders), safety nets, model card and live audit trail. |

## How the AI works

1. **Contract reader (language model, once per guarantee):** pulls the bond clause from the uploaded contract, for example "valid until 3 months after the 12-month defects period". It shows its confidence and asks the client to confirm.
2. **Delay forecast (small model, weekly):** predicts how late a project will finish from the progress payments the client receives in IDEAL. It uses months of work behind plan, how slowly payments arrive, and how far into the schedule the project is.
3. **Action rules on top:** compare the forecast with the bond's expiry, the advance still owed, or the public tender result, then recommend **Extend, Reduce, Release or Keep**.

### Why AI and not just a reminder (synthetic test, 1,800 projects)

| | Expiry reminder | Bond Navigator |
|---|---|---|
| Notice before an extension is needed | 1 month | **6.8 months** (median) |
| Error in forecast finish date | 4.08 months (assume on time) | **1.5 months** |
| Needed extensions spotted early | 0% | **92%** |

A reminder only knows the expiry date. It cannot tell that a project is late, that a tender was lost, or that a contract allows a reduction.

![Pilot results](docs/screenshot-results.png)

More screens: [reduction](docs/screenshot-reduce.png) · [governance](docs/screenshot-governance.png)

## Put it on GitHub (no coding needed)

1. Unzip the download on a computer. Open the folder until you can see `index.html`.
2. On github.com click **+ → New repository**, name it `bond-navigator`, choose **Public**, leave everything else unticked, then **Create repository**.
3. Click **uploading an existing file**. Select everything inside the folder (`index.html`, `README.md`, `css`, `js`, `model`, `docs`) with Ctrl + A and drag it all into the box. Click **Commit changes**.
4. Check the **Code** tab shows `index.html` at the top level (not inside another folder).
5. Go to **Settings → Pages**, set Source to **Deploy from a branch**, Branch **main**, folder **/ (root)**, then **Save**.
6. Wait for the green tick in the **Actions** tab. Your site is at `https://<your-username>.github.io/bond-navigator/`.

To run it without GitHub, just double-click `index.html`.

### Retrain the model (optional)

```bash
pip install numpy scikit-learn
python model/train_model.py
```

## Project structure

```
index.html            Page layout (app bar, left menu, three views)
css/styles.css        Corporate-banking style, phone friendly
js/data.js            Fictional contractor, guarantees, payments, clauses
js/engine.js          Delay forecast and Extend / Reduce / Release / Keep logic
js/app.js             Screens, charts, pre-filled requests, audit trail
js/model-weights.js   Generated by the training script
model/train_model.py  Synthetic projects, training and evaluation
model/weights.json    Same weights, readable
docs/                 Screenshots for this README
```

## 2-minute demo script

1. **Guarantee line:** "This contractor has S$510,000 of its line tied up in guarantees it no longer needs. Freed, that backs S$5 to 10 million of new contracts."
2. **PB-0231:** "Only 56% has been paid, but 91% of the schedule has passed, so the project will finish about 7 months late. The bond expires in 21 days. The red gap shows the uncovered period." Expand **Why this forecast**, then **Prepare extension request** and **Submit to DBS**.
3. **AP-0117:** "Only S$90,000 of the advance is left, so the bond can shrink from S$300,000." Open the pre-filled letter.
4. **TB-1104:** "The public tender result shows we lost, so release the tender bond."
5. **Pilot results:** 6.8 months of notice instead of 1, and the S$20 add-on covers the token cost.
6. **Governance:** flip the kill switch to show the fallback to plain reminders, then show the audit trail.

## Assumptions and limits

- Synthetic data and fictional companies only. A real pilot needs consented client data and a 3-month shadow run.
- Guarantee fee (1% a year), token cost (S$0.02 per 1,000 tokens) and the S$20 monthly fee are assumptions.
- Contract readings are shown for confirmation and are not legal advice.
- Bond Navigator never changes a guarantee itself: the director submits, the client accepts reductions or releases, and DBS trade staff check every amendment.

## Sources

- [DBS eGuarantee@Gov](https://www.dbs.com.sg/sme/trade/eguarantee-gov)
- [Calls on performance bonds in construction disputes (SingaporeLegalAdvice)](https://singaporelegaladvice.com/law-articles/calls-on-performance-bonds-construction-disputes/)
- [ICC Academy: URDG 758](https://academy.iccwbo.org/urdg-758/)
