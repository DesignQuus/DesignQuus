# CLAUDE.md - AI Assistant Guide for DesignQuus

This file provides comprehensive guidance for AI assistants (like Claude) working on the DesignQuus project. It documents codebase structure, development workflows, conventions, and best practices.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Codebase Structure](#codebase-structure)
3. [Development Workflow](#development-workflow)
4. [Code Conventions](#code-conventions)
5. [Testing Guidelines](#testing-guidelines)
6. [Git Workflow](#git-workflow)
7. [Common Tasks](#common-tasks)
8. [Important Context](#important-context)
9. [Troubleshooting](#troubleshooting)

---

## Project Overview

**Project Name:** DesignQuus
**Repository:** DesignQuus/DesignQuus
**Status:** Initial Setup Phase

### Purpose
[To be documented as project develops]

### Tech Stack
[To be documented as technologies are added]

### Key Dependencies
[To be documented as dependencies are added]

---

## Codebase Structure

```
/home/user/DesignQuus/
├── .git/                 # Git repository configuration
├── CLAUDE.md            # This file - AI assistant guidance
└── [To be expanded as project develops]
```

### Directory Organization

As the project develops, maintain clear separation of concerns:

- **Source Code**: Organize by feature or layer (e.g., `/src`, `/lib`, `/app`)
- **Tests**: Keep tests close to code or in dedicated test directories
- **Documentation**: Keep docs in `/docs` or alongside relevant code
- **Configuration**: Root-level config files with explanatory comments
- **Assets**: Static resources in appropriate directories

### Key Files

[To be documented as key files are created]

---

## Development Workflow

### Setting Up Development Environment

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd DesignQuus
   ```

2. **Install dependencies**
   ```bash
   # Add installation commands once package manager is determined
   ```

3. **Configure environment**
   ```bash
   # Add environment setup once determined
   ```

### Making Changes

1. **Create a feature branch**
   ```bash
   git checkout -b claude/<descriptive-name>-<session-id>
   ```

2. **Make your changes**
   - Follow code conventions (see below)
   - Write tests for new functionality
   - Update documentation as needed

3. **Test your changes**
   ```bash
   # Add test commands once determined
   ```

4. **Commit and push**
   ```bash
   git add <files>
   git commit -m "Descriptive message"
   git push -u origin <branch-name>
   ```

---

## Code Conventions

### General Principles

1. **Clarity over cleverness**: Write code that is easy to understand
2. **Consistency**: Follow existing patterns in the codebase
3. **Documentation**: Comment complex logic, not obvious code
4. **Minimalism**: Avoid over-engineering; solve the current problem
5. **Security**: Always validate input and avoid common vulnerabilities (XSS, SQL injection, command injection, etc.)

### Naming Conventions

[To be documented based on project language/framework]

**General Guidelines:**
- Use descriptive, meaningful names
- Avoid abbreviations unless widely understood
- Be consistent with existing codebase patterns

### File Organization

- One primary export per file for modules
- Group related functionality together
- Keep files focused and reasonably sized (< 500 lines ideally)

### Comments and Documentation

- Document **why**, not **what** (code shows what)
- Add comments for complex algorithms or business logic
- Keep comments up-to-date with code changes
- Use JSDoc/docstrings for public APIs

### Error Handling

- Handle errors at appropriate levels
- Provide meaningful error messages
- Log errors with sufficient context
- Don't swallow exceptions silently

---

## Testing Guidelines

### Test Organization

[To be documented once testing framework is chosen]

### Testing Principles

1. **Write tests for**:
   - New features and functionality
   - Bug fixes (regression tests)
   - Critical business logic
   - Edge cases and error conditions

2. **Test structure**:
   - Arrange: Set up test data and conditions
   - Act: Execute the code being tested
   - Assert: Verify the results

3. **Test coverage**:
   - Aim for meaningful coverage, not just high percentages
   - Focus on critical paths and business logic
   - Don't test implementation details

### Running Tests

```bash
# Add test commands once framework is set up
```

---

## Git Workflow

### Branch Naming

- Feature branches: `claude/<feature-name>-<session-id>`
- All branches must start with `claude/` prefix for CI/CD compatibility
- Session ID suffix required for push authentication

### Commit Messages

Write clear, descriptive commit messages:

```
Brief summary (50 chars or less)

More detailed explanation if needed:
- What changed and why
- Any breaking changes
- Related issue numbers

https://claude.ai/code/session_<session-id>
```

### Push Strategy

- Always use: `git push -u origin <branch-name>`
- Branch must follow naming convention (claude/* with session ID)
- Network failures: Retry up to 4 times with exponential backoff (2s, 4s, 8s, 16s)

### Pull Requests

When creating PRs:
- Use descriptive titles (< 70 characters)
- Include summary of changes (bullet points)
- Add test plan with checklist
- Reference any related issues
- Include the session URL

---

## Common Tasks

### Adding a New Feature

1. Create a feature branch following naming conventions
2. Implement the feature with tests
3. Update relevant documentation
4. Commit with descriptive messages
5. Push and create a pull request

### Fixing a Bug

1. Write a failing test that reproduces the bug
2. Fix the bug
3. Verify the test now passes
4. Check for similar bugs elsewhere
5. Commit and push

### Refactoring Code

1. Ensure existing tests pass
2. Make refactoring changes
3. Verify tests still pass
4. Update documentation if APIs changed
5. Commit with clear explanation of refactoring

### Updating Dependencies

1. Review changelog for breaking changes
2. Update dependency version
3. Run full test suite
4. Fix any breaking changes
5. Update documentation if needed

---

## Important Context

### When Working on This Project

1. **Read before modifying**: Always read files before making changes
2. **Use specialized tools**: Prefer dedicated tools (Read, Edit, Write) over bash commands
3. **Verify assumptions**: Don't assume file contents or structure
4. **Test changes**: Verify changes work as expected
5. **Security first**: Always consider security implications

### AI Assistant Best Practices

1. **Explore first**: Use the Explore agent to understand unfamiliar codebases
2. **Plan complex tasks**: Use TodoWrite for multi-step tasks
3. **Parallel operations**: Run independent commands in parallel
4. **Context awareness**: Check memory files for lessons learned
5. **Communication**: Be clear and concise; avoid emojis unless requested

### File Operations

- **Reading**: Use Read tool, not `cat`
- **Searching**: Use Grep tool, not `grep` command
- **Finding files**: Use Glob tool, not `find`
- **Editing**: Use Edit tool, not `sed`
- **Writing**: Use Write tool, not `echo >` or heredocs

### Security Considerations

Always watch for:
- Command injection vulnerabilities
- XSS (Cross-Site Scripting)
- SQL injection
- Improper input validation
- Exposed secrets or credentials
- Insecure dependencies

Never commit:
- API keys or credentials
- `.env` files with secrets
- Personal information
- Large binary files without reason

---

## Troubleshooting

### Common Issues

[To be documented as issues are encountered]

### Debug Workflow

1. **Reproduce the issue**: Verify the problem exists
2. **Identify the scope**: Determine which component is affected
3. **Check logs**: Review error messages and stack traces
4. **Isolate the cause**: Use debugging tools or add logging
5. **Test the fix**: Verify the issue is resolved
6. **Prevent regression**: Add a test if applicable

### Getting Help

- Check existing documentation first
- Search for similar issues in commit history
- Review related code for patterns
- Consult project-specific conventions in this file

---

## Version History

- **2026-02-05**: Initial CLAUDE.md created for new repository

---

## Notes for Future Updates

This document should be updated when:
- Project structure changes significantly
- New conventions or patterns are established
- Development workflow changes
- New tools or frameworks are added
- Common issues and solutions are identified

Keep this file as a living document that grows with the project.
