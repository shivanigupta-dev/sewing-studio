# Publication media capture guide

Use this guide to replace the repository screenshots and create the short GitHub walkthrough. The goal is to show a believable sewing workflow without publishing real measurements, fitting images, file paths, or notes.

## Privacy preflight

1. Use **Explore sample project** in a clean browser profile or a private window.
2. Confirm the workspace says **Fictional sample** and the profile says **Mara Ellis — fictional sample**.
3. Do not add a real backup folder before recording.
4. Close personal tabs and hide the bookmarks bar.
5. Check every visible project title, measurement, note, file chooser, and browser notification.
6. Keep the cursor away from password managers, extension menus, account avatars, and system notifications.

## Visual setup

- Capture on the latest stable Chrome or Edge.
- Use 100% browser zoom.
- Use the light operating-system appearance so browser chrome does not fight the site palette.
- Let the page finish loading and wait for **Saved in this browser**.
- Use a desktop content area near **1440 × 1000 px**.
- Use **390 × 844 px** for mobile captures.
- Prefer PNG for interface screenshots.
- Crop to the website unless the browser frame helps explain local hosting.

GitHub resolves relative image paths against the current branch, so replacing the files below updates every README automatically.

## Required screenshots

### 1. Workspace hero

File: `docs/screenshots/sample-workspace.png`

Show the editorial workspace hero, project summary, and the start of the active-project card. Keep **Fictional sample** visible.

### 2. Interactive pattern

File: `docs/screenshots/interactive-pattern.png`

Open the sample project’s **Pattern** view. Show the heading, front/back control, calculated bodice, numbered markings, and at least part of the measurement detail panel.

### 3. Backup ownership flow

File: `docs/screenshots/backup-workflow.png`

Open **Export & backup**. Show browser autosave, optional folder copy, and the start of **Portable copies**. Do not connect a folder with a personal name.

### 4. Mobile workspace

File: `docs/screenshots/mobile-workspace.png`

At 390 × 844 px, show the workspace hero, unit control, and mobile navigation.

### 5. Mobile pattern

File: `docs/screenshots/mobile-pattern.png`

At 390 × 844 px, show the pattern heading, front/back selector, and upper portion of the rendered bodice.

## Taking the screenshots on macOS

### Desktop

1. Resize the browser so the content area is close to 1440 × 1000.
2. Press **Shift–Command–5**.
3. Select **Capture Selected Portion**.
4. Draw the selection around the website content.
5. In **Options**, choose a temporary capture folder.
6. Capture, review at full size, then rename the file to the required name above.

### Mobile through Chrome DevTools

1. Open the site in Chrome.
2. Press **Option–Command–I** to open DevTools.
3. Press **Command–Shift–M** for the device toolbar.
4. Choose **Responsive** and enter `390` × `844`.
5. Set zoom to 100% and reload.
6. In the device-toolbar menu, choose **Capture screenshot**.

Do not stretch an existing desktop screenshot into a mobile shape; capture the real responsive layout.

## The 60-second walkthrough

Record one calm, silent 45–60 second flow. Move deliberately and pause briefly after each navigation change.

1. **0–6s — Workspace:** show the fictional sample and shared foundations.
2. **6–14s — Project overview:** open the boat-neck project and show the next action.
3. **14–29s — Interactive pattern:** select one numbered marking, change a synthetic measurement slightly, and show the geometry update.
4. **29–39s — Muslin or fit log:** show how an iteration or fitting decision is recorded.
5. **39–50s — Tasks/materials:** show that construction work belongs to the garment project.
6. **50–60s — Export & backup:** show JSON export, folder-copy status, and restore preview language. Do not actually choose a personal file.

Finish with the workspace or the backup page—not a browser download shelf.

## Recording on macOS

1. Press **Shift–Command–5**.
2. Choose **Record Selected Portion**.
3. Select only the browser content.
4. Under **Options**, disable the microphone unless you intentionally want narration.
5. Enable **Show Mouse Clicks** if the setting is available.
6. Record the script above.
7. Stop from the menu bar, then trim the beginning and end in QuickTime Player.
8. Export at 1080p.

Use H.264 video for broad browser compatibility. Aim for **under 10 MB**, which fits GitHub’s free-plan attachment limit. If compression is needed and `ffmpeg` is installed:

```bash
ffmpeg -i sewing-studio-recording.mov \
  -vf "scale=1280:-2,fps=30" \
  -c:v libx264 -crf 27 -preset medium \
  -movflags +faststart -an \
  sewing-studio-walkthrough.mp4
```

Watch the compressed result before sharing it. Text must remain readable.

## Add the video to GitHub

Avoid committing a large video binary to Git history.

1. Open a draft GitHub release, issue, or pull-request comment in the public repository.
2. Drag `sewing-studio-walkthrough.mp4` into the comment box.
3. Wait until GitHub finishes uploading it.
4. Copy the generated `github.com/user-attachments/...` URL.
5. Add this directly below the screenshot gallery in `README.md`:

```markdown
[▶ Watch the 60-second Sewing Studio walkthrough](PASTE-GITHUB-VIDEO-URL-HERE)
```

GitHub accepts MP4, MOV, and WebM attachments. H.264 MP4 is the safest cross-browser choice.

## Final review

- Screenshots match the current release palette and navigation.
- All data is fictional and synthetic.
- Text is readable without zooming.
- No desktop, file-path, notification, or account information is visible.
- Alt text describes the workflow rather than colors alone.
- The video opens while signed out of GitHub if the repository is public.
- The README still renders correctly in both light and dark GitHub themes.
