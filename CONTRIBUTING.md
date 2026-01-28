# Contributing to AppSync POC

Thank you for your interest in contributing to this project! This document provides guidelines and instructions for contributing.

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- AWS CLI configured
- Git
- Basic knowledge of TypeScript, React, and AWS CDK

### Development Setup

1. **Fork and Clone**:
   ```bash
   git clone https://github.com/your-username/poc-appsync.git
   cd poc-appsync
   ```

2. **Install Dependencies**:
   ```bash
   # CDK dependencies
   cd cdk
   npm install
   
   # Frontend dependencies
   cd ../frontend
   npm install
   ```

3. **Set Up Local Environment**:
   ```bash
   # Deploy infrastructure to dev environment
   cd cdk
   cdk deploy --context environment=dev
   
   # Configure frontend with stack outputs
   cd ../frontend
   # Create .env.local with your stack outputs
   ```

## Development Workflow

### Making Changes

1. **Create a Feature Branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Your Changes**:
   - Keep changes focused and minimal
   - Follow existing code style
   - Add tests if applicable
   - Update documentation

3. **Test Your Changes**:
   ```bash
   # Test CDK
   cd cdk
   npm run build
   npm test
   cdk synth --context environment=dev
   
   # Test Frontend
   cd ../frontend
   npm run build
   npm test
   npm start  # Test locally
   ```

4. **Commit Your Changes**:
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

   Follow conventional commit format:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `docs:` for documentation changes
   - `refactor:` for code refactoring
   - `test:` for adding tests
   - `chore:` for maintenance tasks

5. **Push and Create Pull Request**:
   ```bash
   git push origin feature/your-feature-name
   ```
   
   Then create a pull request on GitHub.

## Code Style Guidelines

### TypeScript/JavaScript

- Use TypeScript for type safety
- Follow ESLint rules (if configured)
- Use meaningful variable names
- Add JSDoc comments for complex functions
- Keep functions small and focused

### React Components

- Use functional components with hooks
- Keep components modular and reusable
- Use TypeScript interfaces for props
- Follow the existing component structure
- Add PropTypes or TypeScript types

### CDK Code

- Use constructs for reusable infrastructure
- Add comments for complex configurations
- Use environment-specific configurations
- Follow AWS CDK best practices
- Tag resources appropriately

### CSS

- Use BEM naming convention where applicable
- Keep styles modular and component-specific
- Use CSS variables for theming
- Ensure responsive design

## Testing

### Unit Tests

```bash
# CDK tests
cd cdk
npm test

# Frontend tests
cd frontend
npm test
```

### Integration Tests

Test the complete flow:
1. Deploy to dev environment
2. Create a user in Cognito
3. Sign in to the application
4. Test CRUD operations for Pages, Posts, and Media
5. Verify data in DynamoDB

### Manual Testing Checklist

- [ ] User registration and email verification
- [ ] User login and logout
- [ ] Create Page/Post/Media
- [ ] Edit existing content
- [ ] Delete content
- [ ] Switch between content types
- [ ] Error handling
- [ ] Responsive design on mobile
- [ ] Browser compatibility (Chrome, Firefox, Safari)

## Documentation

### When to Update Documentation

- Adding new features
- Changing existing functionality
- Adding new dependencies
- Modifying deployment process
- Adding new environment variables

### Documentation Files

- **README.md**: Overview and quick start
- **DEPLOYMENT.md**: Detailed deployment instructions
- **CONTRIBUTING.md**: This file
- **Code Comments**: For complex logic
- **GraphQL Schema**: Keep schema.graphql up to date

## Pull Request Guidelines

### Before Submitting

- [ ] Code builds successfully
- [ ] Tests pass
- [ ] Documentation is updated
- [ ] Commits follow conventional format
- [ ] Changes are minimal and focused
- [ ] No unnecessary files committed (node_modules, .env, etc.)

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How has this been tested?

## Checklist
- [ ] Code builds successfully
- [ ] Tests pass
- [ ] Documentation updated
- [ ] No breaking changes (or documented if present)
```

## Issue Reporting

### Bug Reports

Include:
- Description of the bug
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment (OS, Node version, etc.)
- Screenshots if applicable
- Error logs

### Feature Requests

Include:
- Description of the feature
- Use case and benefits
- Proposed implementation (optional)
- Examples from other projects (optional)

## Project Structure

```
poc-appsync/
├── .github/
│   └── workflows/       # CI/CD workflows
├── cdk/                 # AWS CDK infrastructure
│   ├── bin/            # CDK app entry point
│   ├── lib/            # Stack definitions
│   ├── graphql/        # GraphQL schema
│   └── test/           # CDK tests
├── frontend/           # React application
│   ├── public/         # Static files
│   ├── src/
│   │   ├── components/ # React components
│   │   ├── types/      # TypeScript types
│   │   └── ...
│   └── ...
├── scripts/            # Helper scripts
├── README.md
├── DEPLOYMENT.md
└── CONTRIBUTING.md
```

## Common Tasks

### Adding a New GraphQL Field

1. Update `cdk/graphql/schema.graphql`
2. Update resolver if needed in `cdk/lib/cdk-stack.ts`
3. Update TypeScript types in `frontend/src/types/graphql.ts`
4. Update React components to use new field
5. Test the changes
6. Update documentation

### Adding a New Environment

1. No code changes needed
2. Deploy with: `cdk deploy --context environment=<new-env>`
3. Update CI/CD workflow if needed

### Adding a New Component

1. Create component file in `frontend/src/components/`
2. Create corresponding CSS file
3. Add TypeScript types
4. Import and use in parent component
5. Add tests if applicable

### Updating Dependencies

```bash
# Check for outdated packages
npm outdated

# Update specific package
npm install <package>@latest

# Update all packages (careful with breaking changes)
npm update
```

## Code Review Process

### For Contributors

- Be responsive to feedback
- Make requested changes promptly
- Ask questions if unclear
- Keep discussions professional

### For Reviewers

- Be constructive and respectful
- Provide specific feedback
- Test the changes if possible
- Approve or request changes clearly

## Release Process

1. Update version in `package.json`
2. Update CHANGELOG.md (if maintained)
3. Create a git tag
4. Create GitHub release
5. Deploy to production

## Getting Help

- Check existing documentation
- Search existing issues
- Ask in pull request comments
- Open a new issue for discussion

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Accept constructive criticism
- Focus on what's best for the project
- Show empathy towards others

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Feel free to open an issue for any questions or concerns!
