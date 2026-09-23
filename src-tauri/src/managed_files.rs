// ABOUTME: Defines the bundled support files installed into the GIC workspace.
// ABOUTME: Keeps the managed file set in one place for reconcile, resolve, and uninstall.

use crate::workspace::ManagedFile;

pub(crate) const MANAGED_FILES: &[ManagedFile] = &[
    ManagedFile {
        relative_path: "AGENTS.md",
        contents: include_bytes!("../workspace/AGENTS.md"),
    },
    ManagedFile {
        relative_path: ".agents/skills/gic-tutor/SKILL.md",
        contents: include_bytes!("../workspace/gic-tutor/SKILL.md"),
    },
    ManagedFile {
        relative_path: ".agents/skills/gic-tutor/references/language.md",
        contents: include_bytes!("../workspace/gic-tutor/references/language.md"),
    },
];
