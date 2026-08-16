export interface RankInfo {
  level: number;
  rankName: string;
  currentXP: number;
  minXP: number;
  maxXP: number;
  xpInLevel: number;
  xpNeededForLevel: number;
  progressPercent: number;
  xpRemaining: number;
  nextLevelName: string;
  nextRankName: string;
  nextLevelFullTag: string;
}

export function getRankInfo(totalXP: number): RankInfo {
  if (totalXP < 500) {
    const minXP = 0;
    const maxXP = 500;
    const xpInLevel = totalXP - minXP;
    const xpNeededForLevel = maxXP - minXP;
    const progressPercent = Math.min(100, Math.floor((xpInLevel / xpNeededForLevel) * 100));
    return {
      level: 1,
      rankName: "OPERADOR NOVATO",
      currentXP: totalXP,
      minXP,
      maxXP,
      xpInLevel,
      xpNeededForLevel,
      progressPercent,
      xpRemaining: maxXP - totalXP,
      nextLevelName: "LVL 2",
      nextRankName: "AGENTE TÁCTICO",
      nextLevelFullTag: "[ LVL 2 // AGENTE TÁCTICO ]"
    };
  } else if (totalXP < 1200) {
    const minXP = 500;
    const maxXP = 1200;
    const xpInLevel = totalXP - minXP;
    const xpNeededForLevel = maxXP - minXP;
    const progressPercent = Math.min(100, Math.floor((xpInLevel / xpNeededForLevel) * 100));
    return {
      level: 2,
      rankName: "AGENTE TÁCTICO",
      currentXP: totalXP,
      minXP,
      maxXP,
      xpInLevel,
      xpNeededForLevel,
      progressPercent,
      xpRemaining: maxXP - totalXP,
      nextLevelName: "LVL 3",
      nextRankName: "ESPECIALISTA HUD",
      nextLevelFullTag: "[ LVL 3 // ESPECIALISTA HUD ]"
    };
  } else if (totalXP < 2200) {
    const minXP = 1200;
    const maxXP = 2200;
    const xpInLevel = totalXP - minXP;
    const xpNeededForLevel = maxXP - minXP;
    const progressPercent = Math.min(100, Math.floor((xpInLevel / xpNeededForLevel) * 100));
    return {
      level: 3,
      rankName: "ESPECIALISTA HUD",
      currentXP: totalXP,
      minXP,
      maxXP,
      xpInLevel,
      xpNeededForLevel,
      progressPercent,
      xpRemaining: maxXP - totalXP,
      nextLevelName: "LVL 4",
      nextRankName: "COMANDANTE OPERATIVO",
      nextLevelFullTag: "[ LVL 4 // COMANDANTE OPERATIVO ]"
    };
  } else {
    return {
      level: 4,
      rankName: "COMANDANTE OPERATIVO",
      currentXP: totalXP,
      minXP: 2200,
      maxXP: 2200,
      xpInLevel: totalXP - 2200,
      xpNeededForLevel: 1000,
      progressPercent: 100,
      xpRemaining: 0,
      nextLevelName: "MAX",
      nextRankName: "COMANDANTE OPERATIVO",
      nextLevelFullTag: "[ MAX ]"
    };
  }
}
