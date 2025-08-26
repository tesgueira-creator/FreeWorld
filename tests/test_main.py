"""Example tests for the main module."""

from src.main import main

def test_main_returns_greeting():
    """main should return the expected greeting."""
    assert main() == "Hello, World!"
