.PHONY: test test-cov lint format clean install build upload

# Install the package in development mode
install:
	pip install -e .
	pip install pytest pytest-cov black ruff mypy

# Run all tests
test:
	pytest tests/ -v

# Run tests with coverage
test-cov:
	pytest tests/ -v --cov=captcha_background_sdk --cov-report=html --cov-report=term

# Run linting
lint:
	ruff check captcha_background_sdk/
	black --check captcha_background_sdk/
	mypy captcha_background_sdk/

# Format code
format:
	black captcha_background_sdk/ tests/
	ruff check --fix captcha_background_sdk/ tests/

# Clean build artifacts
clean:
	rm -rf build/ dist/ *.egg-info/ .pytest_cache/ .mypy_cache/ .coverage htmlcov/
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete

# Build distribution
build:
	python -m build

# Upload to PyPI (requires credentials)
upload:
	twine upload dist/*

# Upload to Test PyPI
test-upload:
	twine upload --repository testpypi dist/*

# Run all checks before commit
check: lint test
	@echo "All checks passed!"
