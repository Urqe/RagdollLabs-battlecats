import { BLUE_SPEED, LEVEL, clamp } from "./config.js";

export function updateArmy(
  state,
  dt,
  sprinkle,
  end,
  notify = () => {},
  onEffect = null,
) {
  for (let j = state.squads.length - 1; j >= 0; j--) {
    const q = state.squads[j];
    q.y -= BLUE_SPEED * dt;
    q.marchTime = (q.marchTime ?? 0) + dt;
    if (
      q.marchTime >= LEVEL.minMarchTime &&
      q.y <= state.front + LEVEL.arrivalOffset
    ) {
      state.blueTotal += q.count;
      state.squads.splice(j, 1);
      onEffect?.("arrival", state.t, q, state.front);
      sprinkle(
        q.x + (210 - q.x) * 0.8,
        state.front + LEVEL.arrivalOffset,
        "#64bbff",
        4,
      );
      if (q.mult === 999 && !state.finalActivated) {
        state.finalActivated = true;
        notify("×999 REINFORCEMENTS ARRIVED!", 3);
      }
    }
  }

  // Taking the entrance cuts off new arrivals. The existing army stays in combat.
  const access = state.redEntryOpen
    ? clamp(
        (state.front - LEVEL.reinforcementCutoff) / LEVEL.reinforcementApproach,
        0,
        1,
      )
    : 0;
  state.redEntryRate =
    access *
    Math.min(
      LEVEL.maxRedReinforcements,
      LEVEL.redReinforcements + LEVEL.redReinforcementGrowth * state.t,
    );
  state.redTotal += state.redEntryRate * dt;

  const blue = state.blueTotal;
  const red = state.redTotal;
  // The narrow battlefield limits how many reds can be engaged at once.
  const redLossRate = Math.min(LEVEL.maxRedLoss, blue * LEVEL.redLossPerBlue);
  const redLost = Math.min(red, redLossRate * dt);
  const blueInContact = Math.min(blue, red);
  const blueLossRate =
    red * LEVEL.blueLossPerRed + blueInContact * LEVEL.blueContactLoss;
  const blueLost = Math.min(blue, blueLossRate * dt);
  state.redTotal -= redLost;
  state.blueTotal -= blueLost;

  const bluePressure = state.blueTotal;
  const redPressure = state.redTotal * LEVEL.redPressurePerCat;
  const totalPressure = bluePressure + redPressure;
  if (totalPressure > 0) {
    const momentum = (redPressure - bluePressure) / totalPressure;
    const speed = momentum > 0 ? LEVEL.redAdvance : LEVEL.blueAdvance;
    state.front = clamp(
      state.front + momentum * speed * dt,
      LEVEL.minFront,
      LEVEL.maxFront,
    );
  }

  state.redRecentLoss += redLost;
  state.blueRecentLoss += blueLost;
  state.nextCombatEffect -= dt;
  if (state.nextCombatEffect <= 0) {
    const half = clamp(24 + Math.abs(state.front - 258) * 0.3, 24, 110);
    const x = 210 + Math.sin(state.t * 13) * half * 0.7;
    impact(sprinkle, state.redRecentLoss, x, state.front - 4, "#df544b");
    impact(sprinkle, state.blueRecentLoss, 420 - x, state.front + 8, "#65baff");
    if (state.redRecentLoss > 0 || state.blueRecentLoss > 0) {
      onEffect?.(
        "clash",
        state.t,
        x,
        state.front,
        state.redRecentLoss,
        state.blueRecentLoss,
      );
    }
    state.redRecentLoss = 0;
    state.blueRecentLoss = 0;
    state.nextCombatEffect += LEVEL.combatEffectInterval;
  }

  if (
    state.redEntryOpen &&
    state.blueTotal > 0 &&
    state.front <= LEVEL.reinforcementCutoff
  ) {
    state.redEntryOpen = false;
    state.redEntryRate = 0;
  }
  if (!state.redEntryOpen && state.redTotal === 0) {
    end(true);
  } else if (state.front >= LEVEL.castleFront) {
    end(false);
  }
}

function impact(sprinkle, loss, x, y, color) {
  if (loss > 0) {
    sprinkle(x, y, color, Math.min(4, Math.ceil(Math.sqrt(loss) / 3)));
  }
}
