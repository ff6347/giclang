// ABOUTME: Provides bounded lookup into the bundled GIC language reference.
// ABOUTME: Keeps model-facing reference access independent of files and network.

const REFERENCE: &str = include_str!("../workspace/gic-tutor/references/language.md");
const MAX_QUERY_CHARS: usize = 200;
const MAX_RESULTS: usize = 5;
const MAX_SECTION_BYTES: usize = 4 * 1024;

pub(crate) fn search_reference(query: &str) -> Vec<String> {
    let query = query.trim();
    if query.is_empty() || query.chars().count() > MAX_QUERY_CHARS {
        return Vec::new();
    }

    let exact = query.to_lowercase();
    let fallback = query
        .split(|character: char| !character.is_alphanumeric() && character != '_')
        .map(str::to_lowercase)
        .find(|word| {
            word.len() >= 3
                && !matches!(
                    word.as_str(),
                    "how"
                        | "many"
                        | "arguments"
                        | "does"
                        | "the"
                        | "function"
                        | "take"
                        | "what"
                        | "are"
                        | "about"
                        | "for"
                        | "with"
                        | "syntax"
                )
        });
    for needle in std::iter::once(exact.as_str()).chain(fallback.as_deref()) {
        let mut heading = "";
        let mut results = Vec::new();
        for line in REFERENCE.lines() {
            if line.starts_with("## ") {
                heading = line;
            }
            if line.to_lowercase().contains(needle) {
                results.push(format!("{heading}\n{line}"));
                if results.len() == MAX_RESULTS {
                    break;
                }
            }
        }
        if !results.is_empty() {
            return results;
        }
    }
    Vec::new()
}

pub(crate) fn read_reference(section: &str) -> Option<String> {
    let section = section.trim();
    if section.is_empty() || section.chars().count() > MAX_QUERY_CHARS {
        return None;
    }

    let section = section
        .strip_prefix("## ")
        .unwrap_or(section)
        .trim()
        .to_lowercase();
    let mut lines = REFERENCE.lines();
    while let Some(line) = lines.next() {
        let Some(title) = line.strip_prefix("## ") else {
            continue;
        };
        if title.trim().to_lowercase() != section {
            continue;
        }

        let mut content = format!("{line}\n");
        for line in lines {
            if line.starts_with("## ") {
                break;
            }
            content.push_str(line);
            content.push('\n');
            if content.len() >= MAX_SECTION_BYTES {
                break;
            }
        }
        while content.len() > MAX_SECTION_BYTES {
            content.pop();
        }
        return Some(content);
    }
    None
}

#[cfg(test)]
mod tests {
    use super::{read_reference, search_reference};

    #[test]
    fn searches_real_reference_for_drawing_circle() {
        let results = search_reference("  CIRCLE(X, Y, RADIUS);  ");

        assert_eq!(results.len(), 1);
        assert!(results[0].contains("## Drawing"));
        assert!(results[0].contains("circle(x, y, radius);"));
    }

    #[test]
    fn searches_natural_language_queries_for_the_relevant_term() {
        let results = search_reference("How many arguments does the circle function take?");

        assert!(results.iter().any(|result| {
            result.contains("## Drawing") && result.contains("circle(x, y, radius);")
        }));
    }

    #[test]
    fn searches_real_reference_for_math_constant() {
        let results = search_reference("`PI`");

        assert_eq!(results.len(), 1);
        assert!(results[0].contains("## Math and constants"));
        assert!(results[0].contains("PI"));
    }

    #[test]
    fn missing_heading_is_not_readable() {
        assert_eq!(read_reference("A heading that does not exist"), None);
    }

    #[test]
    fn rejects_empty_and_oversized_queries() {
        assert!(search_reference(" \n\t ").is_empty());
        assert!(search_reference(&"x".repeat(201)).is_empty());
        assert_eq!(read_reference(" \n\t "), None);
        assert_eq!(read_reference(&"x".repeat(201)), None);
    }

    #[test]
    fn reads_only_the_named_section_within_the_output_limit() {
        let section = read_reference("drawing").expect("Drawing section should exist");

        assert!(section.starts_with("## Drawing"));
        assert!(section.contains("circle(x, y, radius);"));
        assert!(!section.contains("## Output"));
        assert!(section.len() <= 4 * 1024);
    }
}
