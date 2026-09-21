# PyLearn

Learn Python fast: Notion-style lessons, a VS Code editor (Monaco) and an animated output pane. Real Python 3 runs in your browser through Pyodide.

```bash
npm install
npm run dev            # http://localhost:5173
npm run check:lessons  # verify every lesson in real Python
```

- **Lessons**: `src/lessons/NN-slug.md`. The frontmatter sets `title` and `section`. Fenced blocks tagged `python starter`, `python solution` and `python check` are the challenge; the check is asserts that can read `__stdout__` and `__src__`.
- **History and progress**: IndexedDB (Dexie), saved in this browser only.
- **Design**: `.design/pylearn/` holds the Notion design system, the design brief, the information architecture and the build tasks.
- **Shortcuts**: ⌘↵ run · ⌘. stop · ⌘K search · ⌘B sidebar · ⌘\ output pane · D theme.
