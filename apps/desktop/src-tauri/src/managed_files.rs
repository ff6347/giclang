// ABOUTME: Defines the bundled support files installed into the GIC workspace.
// ABOUTME: Keeps the managed file set in one place for reconcile, resolve, and uninstall.

use crate::workspace::ManagedFile;

pub(crate) const MANAGED_FILES: &[ManagedFile] = &[
    ManagedFile {
        relative_path: "AGENTS.md",
        contents: include_bytes!("../workspace/AGENTS.md"),
    },
    ManagedFile {
        relative_path: ".agents/skills/gic-agent/SKILL.md",
        contents: include_bytes!("../../../../packages/content/content/skills/gic-agent/SKILL.md"),
    },
    ManagedFile {
        relative_path: ".agents/skills/gic-agent/references/language.md",
        contents: include_bytes!(
            "../../../../packages/content/content/skills/gic-agent/references/language.md"
        ),
    },
];
