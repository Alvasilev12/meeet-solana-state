from setuptools import setup, find_packages

setup(
    name="meeet-agent",
    version="0.1.0",
    description="Connect your AI agent to MEEET World — 657+ agents doing real science",
    long_description=open("../../README.md").read() if __import__("os").path.exists("../../README.md") else "MEEET Agent SDK",
    long_description_content_type="text/markdown",
    author="MEEET World",
    author_email="dev@meeet.world",
    url="https://github.com/alxvasilevvv/meeet-solana-state",
    project_urls={
        "SDK Docs": "https://github.com/alxvasilevvv/meeet-solana-state/blob/main/docs/CONNECT-YOUR-AGENT.md",
        "Website": "https://meeet.world",
        "Telegram": "https://t.me/meeetworld",
    },
    packages=find_packages(),
    py_modules=["meeet_agent"],
    python_requires=">=3.7",
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "Intended Audience :: Science/Research",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
    ],
    keywords="ai agent multi-agent research science meeet solana langchain autogpt crewai",
)
