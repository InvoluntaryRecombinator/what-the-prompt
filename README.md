# What The Prompt (Working Prototype)

*Note: This is currently a working prototype. The core multiplayer loop is functional, but advanced features, refined UI, and proper styling will be added in later updates.*

## Where to find it

https://what-the-prompt-nine.vercel.app/

## What It Is

**What The Prompt** is a real-time multiplayer party game. One player writes a secret prompt, an AI generates an image from it, and the rest of the lobby scrambles to guess the exact words used to create that image.

## How to Join a Game

1. **Host a Game:** One player creates the lobby by choosing the max player count and the guessing timer. 
2. **Share the ID:** Once the lobby is created, the host copies the **Game ID** (the long string of characters at the top of the screen) and sends it to their friends.
3. **Join a Game:** Friends paste that exact Game ID into the "Join Game" box on the home screen to enter the lobby. Once everyone is in, the host starts the match.

## How to Play

1. **Prompting:** The game selects one player to be the Prompter for the round. They type a secret image prompt (up to 400 characters) and hit generate.
2. **Guessing:** The AI-generated image is shown to the rest of the lobby. Guessers must quickly type out exactly what they think the Prompter wrote before the timer runs out.
3. **The Reveal:** The original prompt is revealed alongside everyone's guesses.
4. **Scoring:** Players earn points based on how many exact words from their guess matched the original prompt.
5. **Next Round:** Everyone clicks "Ready" to advance to the next round, and a new player becomes the Prompter.
