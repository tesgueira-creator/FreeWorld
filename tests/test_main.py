import pytest

from src.main import main

def test_main_returns_greeting():
    assert main() == "Hello, FreeWorld!"
