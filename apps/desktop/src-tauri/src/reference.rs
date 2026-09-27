// ABOUTME: Provides bounded lookup into the bundled GIC language reference.
// ABOUTME: Keeps model-facing reference access independent of files and network.

const REFERENCE: &str = include_str!("../workspace/gic-tutor/references/language.md");
const MAX_QUERY_CHARS: usize = 200;
const MAX_RESULTS: usize = 5;
const MAX_EXCERPT_CHARS: usize = 384;
const MAX_SECTION_BYTES: usize = 4 * 1024;

pub(crate) fn reference_headings() -> String {
    REFERENCE
        .lines()
        .filter_map(|line| line.strip_prefix("## "))
        .collect::<Vec<_>>()
        .join(", ")
}

pub(crate) fn search_reference(query: &str) -> Vec<String> {
    let query = query.trim();
    if query.is_empty() || query.chars().count() > MAX_QUERY_CHARS {
        return Vec::new();
    }

    let mut terms = query
        .split(|character: char| !character.is_alphanumeric() && character != '_')
        .map(str::to_lowercase)
        .filter(|word| {
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
        })
        .collect::<Vec<_>>();
    terms.sort_by_key(|word| std::cmp::Reverse(word.len()));
    let lines = REFERENCE.lines().collect::<Vec<_>>();
    let exact = query.to_lowercase();
    for (needles, signatures_only) in [
        (std::slice::from_ref(&exact), false),
        (terms.as_slice(), true),
        (terms.as_slice(), false),
    ] {
        for needle in needles {
            let mut heading = "";
            let mut results = Vec::new();
            for (index, line) in lines.iter().enumerate() {
                if line.starts_with("## ") {
                    heading = line;
                }
                if heading.is_empty()
                    || !line.to_lowercase().contains(needle)
                    || (signatures_only && !(line.trim_end().ends_with(");") && line.contains('(')))
                {
                    continue;
                }
                let mut excerpt = format!("{heading}\n");
                for nearby in [
                    index.checked_sub(1).and_then(|at| lines.get(at)),
                    Some(line),
                    lines.get(index + 1),
                ]
                .into_iter()
                .flatten()
                {
                    if !nearby.starts_with("## ") {
                        excerpt.push_str(nearby);
                        excerpt.push('\n');
                    }
                }
                results.push(excerpt.chars().take(MAX_EXCERPT_CHARS).collect());
                if results.len() == MAX_RESULTS {
                    break;
                }
            }
            if !results.is_empty() {
                return results;
            }
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
    use super::{read_reference, reference_headings, search_reference};

    #[test]
    fn section_map_uses_only_bundled_headings() {
        let headings = reference_headings();

        assert!(headings.starts_with("Values, Comments, Variables"));
        assert!(headings.contains("Drawing"));
        assert!(headings.contains("Math and constants"));
        assert!(!headings.contains("circle(x, y, radius)"));
    }

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
    fn search_finds_later_query_terms_and_surrounding_lines() {
        let results = search_reference("Tell me about circle");

        assert!(results.iter().any(|result| {
            result.contains("## Drawing")
                && result.contains("rect(x, y, width, height);")
                && result.contains("circle(x, y, radius);")
                && result.contains("ellipse(x, y, width, height);")
        }));
        assert!(results.len() <= 5);
    }

    #[test]
    fn search_prefers_relevant_code_over_generic_prose() {
        let results = search_reference("How does this program draw a circle?");

        assert!(results
            .iter()
            .any(|result| result.contains("circle(x, y, radius);")));
        assert!(!results
            .iter()
            .any(|result| result.contains("Global names are reserved")));
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
