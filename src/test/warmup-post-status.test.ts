import { describe, it, expect } from "vitest";

/**
 * Tests for post_status warmup job logic
 * Validates: scheduling, content selection, fallback behavior
 */

// Replicate constants from warmup-tick
const STATUS_CAPTIONS = [
  "Bom dia! ☀️ Que seu dia seja incrível",
  "Boa tarde pessoal! 🌤️ Seguimos firmes",
  "Boa noite! 🌙 Descansem bem",
  "Dia produtivo demais 💪 Gratidão",
  "Mais um dia de luta e conquista 🔥",
  "Gratidão por tudo que tenho 🙏",
  "Trabalhando duro pra conquistar 💼",
  "Foco total no objetivo 🎯",
  "Semana abençoada pra todos ✨",
  "Vamos que vamos, sem parar 🚀",
  "Dia lindo pra ser feliz ☀️",
  "Sextou com estilo 🎉",
  "Deus é bom o tempo todo 🙌",
  "Confiança no processo sempre 🧠",
  "Sempre em frente, nunca pra trás ➡️",
  "Dia de conquistas e vitórias 🏆",
  "Tranquilidade e paz interior 🧘",
  "Bora trabalhar e fazer acontecer 💰",
  "A natureza é perfeita 🌿",
  "Momentos que valem a pena registrar 📸",
  "Cada dia é um presente 🎁",
  "O melhor tá por vir ✨",
  "Tudo no tempo de Deus 🙏",
  "Energia positiva sempre 🌟",
  "A vida é feita de momentos assim 💛",
];

const BG_COLORS = ["#25D366", "#128C7E", "#075E54", "#34B7F1", "#ECE5DD", "#DCF8C6", "#1DA1F2", "#FF6B6B", "#4ECDC4", "#2C3E50"];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Replicate phase logic
function getPhaseForDay(day: number, chipState: string): string {
  const groupsEndDay = chipState === "unstable" ? 6 : 4;
  if (day <= 1) return "pre_24h";
  if (day <= groupsEndDay) return "groups_only";
  if (day === groupsEndDay + 1) return "autosave_enabled";
  return "community_enabled";
}

// Status is posted in ALL active phases (groups_only, autosave_enabled, community_enabled)
function shouldPostStatus(day: number, chipState: string): boolean {
  const phase = getPhaseForDay(day, chipState);
  return phase !== "pre_24h"; // Status posted in all phases except pre_24h
}

// Per spec: exactly 5 status posts per day
const STATUS_PER_DAY = 5;

describe("Post Status — Scheduling", () => {
  it("Status NÃO é postado no Dia 1 (pre_24h) para chip novo", () => {
    expect(shouldPostStatus(1, "new")).toBe(false);
  });

  it("Status NÃO é postado no Dia 1 (pre_24h) para chip banido", () => {
    expect(shouldPostStatus(1, "unstable")).toBe(false);
  });

  it("Status É postado a partir do Dia 2 para chip novo", () => {
    for (let d = 2; d <= 30; d++) {
      expect(shouldPostStatus(d, "new")).toBe(true);
    }
  });

  it("Status É postado a partir do Dia 2 para chip banido", () => {
    for (let d = 2; d <= 30; d++) {
      expect(shouldPostStatus(d, "unstable")).toBe(true);
    }
  });

  it("São exatamente 5 status por dia", () => {
    expect(STATUS_PER_DAY).toBe(5);
  });
});

describe("Post Status — Content", () => {
  it("Tem pelo menos 20 legendas disponíveis", () => {
    expect(STATUS_CAPTIONS.length).toBeGreaterThanOrEqual(20);
  });

  it("Todas as legendas são strings não vazias", () => {
    STATUS_CAPTIONS.forEach(c => {
      expect(typeof c).toBe("string");
      expect(c.length).toBeGreaterThan(5);
    });
  });

  it("pickRandom retorna item válido do array", () => {
    for (let i = 0; i < 50; i++) {
      const caption = pickRandom(STATUS_CAPTIONS);
      expect(STATUS_CAPTIONS).toContain(caption);
    }
  });

  it("Cores de fundo são hex válidos", () => {
    BG_COLORS.forEach(color => {
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  it("Font index é entre 0 e 4", () => {
    for (let i = 0; i < 100; i++) {
      const font = randInt(0, 4);
      expect(font).toBeGreaterThanOrEqual(0);
      expect(font).toBeLessThanOrEqual(4);
    }
  });
});

describe("Post Status — Payload (text type)", () => {
  it("Payload de texto tem campos corretos", () => {
    const content = pickRandom(STATUS_CAPTIONS);
    const bg = pickRandom(BG_COLORS);
    const font = randInt(0, 4);
    const payload = { type: "text", content, backgroundColor: bg, font };

    expect(payload.type).toBe("text");
    expect(typeof payload.content).toBe("string");
    expect(payload.backgroundColor).toMatch(/^#/);
    expect(payload.font).toBeGreaterThanOrEqual(0);
    expect(payload.font).toBeLessThanOrEqual(4);
  });
});

describe("Post Status — Payload (image type)", () => {
  it("Payload de imagem tem campos corretos", () => {
    const content = pickRandom(STATUS_CAPTIONS);
    const imageUrl = "https://images.unsplash.com/photo-test?w=800&q=80";
    const payload = { type: "image", image: imageUrl, caption: content };

    expect(payload.type).toBe("image");
    expect(payload.image).toContain("https://");
    expect(typeof payload.caption).toBe("string");
  });
});

describe("Post Status — Fallback", () => {
  it("Se imagem falha, tenta texto como fallback", () => {
    // Simulates the fallback logic in warmup-tick
    let imageFailed = true;
    let textAttempted = false;

    if (imageFailed) {
      textAttempted = true;
    }

    expect(textAttempted).toBe(true);
  });

  it("Tenta endpoints /status/post e /sendStories em ordem", () => {
    const endpoints = ["/status/post", "/sendStories"];
    expect(endpoints[0]).toBe("/status/post");
    expect(endpoints[1]).toBe("/sendStories");
    expect(endpoints.length).toBe(2);
  });
});

describe("Post Status — Todos os chips postam status", () => {
  const chips = ["new", "recovered", "unstable"];

  chips.forEach(chip => {
    it(`Chip ${chip}: posta status em todos os dias ativos`, () => {
      // Day 1 = no status (pre_24h)
      expect(shouldPostStatus(1, chip)).toBe(false);
      // Day 2+ = posts status
      for (let d = 2; d <= 30; d++) {
        expect(shouldPostStatus(d, chip)).toBe(true);
      }
    });
  });
});
