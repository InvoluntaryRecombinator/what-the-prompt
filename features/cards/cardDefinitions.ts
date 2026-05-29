export type CardDefinition = {
  id: string;
  name: string;
  description: string;
  icon: string;
  target: "player";
  effect: "guessing";
};

export const cardDefinitions: Record<string, CardDefinition> = {
  ddos: {
    id: "ddos",
    name: "DDoS",
    description: "Blur a target player's generated image during guessing.",
    icon: "DDoS",
    target: "player",
    effect: "guessing",
  },
};

export const cardDefinitionList = Object.values(cardDefinitions);
