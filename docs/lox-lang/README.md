# Lox Language

A Java implementation of the Lox programming language from [Crafting Interpreters](https://craftinginterpreters.com/).

## Project Structure

```
me/fabianmoronzirfas/lox/    # Lox interpreter source
me/fabianmoronzirfas/tool/   # Code generation tools
```

## Setup

Requires Java 21. Install via [mise](https://mise.jdx.dev/):

```sh
mise install
```

## Build & Run

```sh
mise run compile          # Compile the interpreter
mise run compile-tools    # Compile code generation tools
mise run run-generate-ast # Generate AST classes
```

## Editor Setup (Zed)

The Zed Java extension uses JDTLS. Since this project has no build tool (Maven/Gradle), JDTLS needs to be told where the source roots are.

### Source Path Configuration

The `.zed/settings.json` configures `sourcePaths` so JDTLS resolves packages correctly. The key detail: `sourcePaths` must be nested under `settings.java.project`, not directly under `initialization_options.project` (the [extension README](https://github.com/zed-extensions/java) example is misleading).

Correct:

```jsonc
{
  "lsp": {
    "jdtls": {
      "initialization_options": {
        "settings": {
          "java": {
            "project": {
              "sourcePaths": ["."]
            }
          }
        }
      }
    }
  }
}
```

Wrong (causes `The declared package does not match the expected package ""`):

```jsonc
{
  "lsp": {
    "jdtls": {
      "initialization_options": {
        "project": {
          "sourcePaths": ["."]
        }
      }
    }
  }
}
```

### Clearing the JDTLS Cache

If JDTLS still reports stale errors after changing settings, delete the cache and restart the language server:

```sh
rm -rf ~/Library/Caches/jdtls-*
```

Then in Zed: Cmd+Shift+P -> "language: restart language servers".
