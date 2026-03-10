import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

// ── Message pools for natural conversation ──
const groupMessages = [
  "Bom dia! 😊", "Boa tarde pessoal!", "Boa noite! 🌙",
  "Alguém sabe de alguma novidade?", "Como vocês estão?",
  "Valeu pessoal! 👍", "Ótima informação, obrigado!",
  "Concordo totalmente 👏", "Interessante isso!", "Show de bola! 🔥",
  "Boa semana a todos!", "Obrigado por compartilhar!",
  "Muito bom isso!", "Top demais 🚀", "Verdade!", "Com certeza!",
  "Excelente ponto!", "Parabéns pelo conteúdo 🎉", "Adorei essa dica!",
  "Muito útil, valeu!", "Tô acompanhando 👀", "Boa! Vou aplicar isso",
  "Sensacional 💯", "Que legal, não sabia disso", "Perfeito, obrigado!",
  "Salvei aqui, valeu!", "Bom demais 🙌", "Isso aí, concordo",
  "Exatamente!", "Massa demais!", "Alguém mais concorda? 🤔",
  "Ótimo dia pra todos 🌤️", "Bora que bora! 💪",
  "Alguém tem dica sobre isso?", "Tô ligado nisso tb",
  "Eita, que top!", "Boa sorte galera!", "Tmj! 🤝",
  "Quem mais tá acompanhando?", "Faz sentido!", "Curti muito 👌",
  "Mandou bem!", "Essa é boa hein", "Tamo junto!", "Bacana demais 😃",
  "Li tudo, muito bom", "Vou testar aqui", "Obrigadão! 🙏",
  "Que conteúdo massa", "Continue postando!", "Valeu demais pessoal",
];

const autosaveMessages = [
  "Oi, tudo bem? 😊", "E aí, como vai?", "Oi! Tudo certo por aí?",
  "Eae, blz? 👋", "Fala, como tá?", "Oi oi!",
  "Passando pra dar um oi 😄", "Bom dia! Tudo joia?",
  "Boa tarde! Como está?", "Oi! Espero que esteja bem 🌟",
  "Ei, saudades! Como anda?", "Opa, tudo tranquilo?",
  "Fala aí, firmeza? ✌️", "Mandando um oi rápido!",
  "Pensei em vc, como tá? 😊",
];

const communityMessages = [
  "E aí, tudo bem? 😊", "Fala! Como tá o dia?",
  "Opa, tudo tranquilo por aí?", "Bom dia! 🌅",
  "Boa tarde! Firmeza?", "Boa noite! Como foi o dia?",
  "Que bom falar ctg! 😄", "Tô aqui, e vc?",
  "Hoje tá corrido demais 😅", "Pois é, por aqui tb",
  "Ss, concordo total", "Exato!", "Verdade hein",
  "Boa essa! 😂", "Kkkk demais", "Né? Achei isso tb",
  "Ah sim, entendi", "Show!", "Valeu pela dica 👍",
  "Vou ver isso", "Massa!", "Legal demais",
  "Tô ligado", "Aham, faz sentido", "Boa! 🔥",
  "Cara, muito bom isso", "Sério? Não sabia",
  "Que top!", "Tmj! 🤝", "Blz, combinado",
  "Te mando depois", "Ok, tranquilo", "Beleza!",
  "Ah sim, pode crer", "Tá certo", "Vamo que vamo! 💪",
  "Kkk verdade", "😂😂", "👍👍", "🔥🔥🔥",
  "Tô por aqui qualquer coisa", "Show de bola",
  "Dahora!", "Curti muito isso", "Arrasou! 🎉",
  "Boa sorte! 🍀", "Sucesso pra vc!", "Obrigado! 🙏",
  "De nada! 😊", "Sempre! Tmj",
  "haha", "kkk", "😊", "👀", "top", "blz", "ss",
  "hmm", "aham", "uhum", "boa", "joia", "firmeza",
  "Falou!", "Até mais! 👋", "Bom fds! 🎉",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const secret = req.headers.get("x-internal-secret");
  const expectedSecret = Deno.env.get("INTERNAL_TICK_SECRET");
  if (!expectedSecret || secret !== expectedSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(supabaseUrl, serviceKey);

  let body: any = {};
  try { body = await req.json(); } catch (_e) { /* ignore */ }

  const action = body.action || "tick";

  try {
    if (action === "daily") {
      return await handleDailyReset(db);
    }
    return await handleTick(db);
  } catch (err) {
    console.error("[warmup-tick] Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ── Helpers ──
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function backoffMinutes(attempt: number): number {
  return [5, 15, 60, 180, 360][Math.min(attempt, 4)];
}

function getPhaseForDay(day: number): string {
  if (day <= 1) return "pre_24h";
  if (day <= 2) return "groups_only";
  if (day <= 4) return "autosave_enabled";
  if (day <= 6) return "community_light";
  return "community_enabled";
}

async function uazapiSendText(baseUrl: string, token: string, number: string, text: string) {
  const url = `${baseUrl}/send/text`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", token, Accept: "application/json" },
    body: JSON.stringify({ number, text }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API ${res.status}: ${errText}`);
  }
  return await res.json();
}

// ════════════════════════════════════════
// TICK HANDLER — process pending jobs
// ════════════════════════════════════════
async function handleTick(db: any) {
  const now = new Date().toISOString();

  const { data: pendingJobs, error: fetchErr } = await db
    .from("warmup_jobs")
    .select("id, user_id, device_id, cycle_id, job_type, payload, run_at, status, attempts, max_attempts")
    .eq("status", "pending")
    .lte("run_at", now)
    .order("run_at", { ascending: true })
    .limit(20); // Process in smaller batches to respect edge function timeout

  if (fetchErr) throw fetchErr;

  if (!pendingJobs || pendingJobs.length === 0) {
    const { data: nextPending } = await db
      .from("warmup_jobs")
      .select("run_at")
      .eq("status", "pending")
      .order("run_at", { ascending: true })
      .limit(1);

    return json({ ok: true, processed_jobs_count: 0, succeeded: 0, failed: 0, next_pending_run_at: nextPending?.[0]?.run_at || null });
  }

  // Mark as running
  const jobIds = pendingJobs.map((j: any) => j.id);
  await db.from("warmup_jobs").update({ status: "running" }).in("id", jobIds);

  let succeeded = 0;
  let failed = 0;

  for (const job of pendingJobs) {
    try {
      // ── Get cycle ──
      const { data: cycle } = await db
        .from("warmup_cycles")
        .select("id, user_id, device_id, phase, is_running, day_index, days_total, chip_state, daily_interaction_budget_min, daily_interaction_budget_max, daily_interaction_budget_target, daily_interaction_budget_used, daily_unique_recipients_cap, daily_unique_recipients_used, first_24h_ends_at, last_daily_reset_at, next_run_at, plan_id")
        .eq("id", job.cycle_id)
        .single();

      if (!cycle || !cycle.is_running) {
        await db.from("warmup_jobs").update({ status: "cancelled" }).eq("id", job.id);
        continue;
      }

      // ── PLAN CHECK ──
      const { data: userSub } = await db
        .from("subscriptions")
        .select("expires_at")
        .eq("user_id", cycle.user_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const { data: userProf } = await db.from("profiles").select("status").eq("id", cycle.user_id).maybeSingle();
      if (!userSub || new Date(userSub.expires_at) < new Date() || userProf?.status === "suspended" || userProf?.status === "cancelled") {
        await db.from("warmup_cycles").update({
          is_running: false, phase: "paused", previous_phase: cycle.phase,
          last_error: "Auto-pausado: plano inativo",
        }).eq("id", cycle.id);
        await db.from("warmup_jobs").update({ status: "cancelled" }).eq("id", job.id);
        continue;
      }

      // ── Device check ──
      const { data: device } = await db
        .from("devices")
        .select("status, uazapi_token, uazapi_base_url")
        .eq("id", job.device_id)
        .single();

      if (!device || device.status !== "Ready") {
        if (cycle.phase !== "paused") {
          await db.from("warmup_cycles").update({
            is_running: false, phase: "paused", previous_phase: cycle.phase,
            last_error: "Auto-pausado: instância desconectada",
          }).eq("id", cycle.id);
          await db.from("warmup_jobs").update({ status: "cancelled" }).eq("cycle_id", cycle.id).eq("status", "pending");
          await db.from("warmup_audit_logs").insert({
            user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
            level: "warn", event_type: "auto_paused_disconnected",
            message: `Aquecimento pausado: instância desconectada (fase: ${cycle.phase})`,
          });
        }
        await db.from("warmup_jobs").update({ status: "cancelled" }).eq("id", job.id);
        continue;
      }

      const baseUrl = (device.uazapi_base_url || "").replace(/\/+$/, "");
      const token = device.uazapi_token || "";

      // ── Process job by type ──
      switch (job.job_type) {
        case "join_group": {
          const groupId = job.payload?.group_id;
          // TODO: Actually call UAZAPI to join group via invite link
          // For now, mark as joined
          await db.from("warmup_instance_groups")
            .update({ join_status: "joined", joined_at: new Date().toISOString() })
            .eq("device_id", job.device_id)
            .eq("group_id", groupId);

          await db.from("warmup_audit_logs").insert({
            user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
            level: "info", event_type: "group_joined",
            message: `Entrada no grupo: ${job.payload?.group_name || groupId}`,
            meta: job.payload,
          });
          break;
        }

        case "phase_transition": {
          const targetPhase = job.payload?.target_phase || "groups_only";
          await db.from("warmup_cycles").update({ phase: targetPhase }).eq("id", cycle.id);
          await db.from("warmup_audit_logs").insert({
            user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
            level: "info", event_type: "phase_changed",
            message: `Fase alterada: ${cycle.phase} → ${targetPhase}`,
            meta: { from: cycle.phase, to: targetPhase },
          });
          break;
        }

        case "group_interaction": {
          // Send a message to a random joined group
          if (!baseUrl || !token) {
            throw new Error("Credenciais UAZAPI não configuradas");
          }

          // Get joined groups for this device
          const { data: joinedGroups } = await db
            .from("warmup_instance_groups")
            .select("group_id")
            .eq("device_id", job.device_id)
            .eq("cycle_id", cycle.id)
            .eq("join_status", "joined");

          if (!joinedGroups || joinedGroups.length === 0) {
            throw new Error("Nenhum grupo joined encontrado");
          }

          // Get user custom messages or use defaults
          const { data: userMsgs } = await db
            .from("warmup_messages")
            .select("content")
            .eq("user_id", job.user_id);

          const msgPool = (userMsgs && userMsgs.length > 0)
            ? userMsgs.map((m: any) => m.content)
            : groupMessages;

          // Get the group pool record to find the external reference
          const targetGroupRecord = pickRandom(joinedGroups);
          const { data: poolGroup } = await db
            .from("warmup_groups_pool")
            .select("external_group_ref, name")
            .eq("id", targetGroupRecord.group_id)
            .single();

          if (!poolGroup?.external_group_ref) {
            // Can't send without JID - log and skip
            await db.from("warmup_audit_logs").insert({
              user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
              level: "warn", event_type: "group_no_jid",
              message: `Grupo sem JID externo: ${poolGroup?.name || targetGroupRecord.group_id}`,
            });
            break;
          }

          const message = pickRandom(msgPool);
          await uazapiSendText(baseUrl, token, poolGroup.external_group_ref, message);

          // Update budget
          await db.from("warmup_cycles").update({
            daily_interaction_budget_used: (cycle.daily_interaction_budget_used || 0) + 1,
          }).eq("id", cycle.id);

          // Log to warmup_audit_logs
          await db.from("warmup_audit_logs").insert({
            user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
            level: "info", event_type: "group_msg_sent",
            message: `Msg enviada no grupo ${poolGroup.name}: "${message.substring(0, 50)}"`,
            meta: { group_name: poolGroup.name, group_jid: poolGroup.external_group_ref },
          });
          break;
        }

        case "autosave_interaction": {
          // Send message to an autosave contact
          if (!baseUrl || !token) {
            throw new Error("Credenciais UAZAPI não configuradas");
          }

          const recipientIndex = job.payload?.recipient_index ?? 0;
          const msgIndex = job.payload?.msg_index ?? 0;

          // Get autosave contacts for this user
          const { data: contacts } = await db
            .from("warmup_autosave_contacts")
            .select("id, phone_e164, contact_name")
            .eq("user_id", job.user_id)
            .eq("is_active", true)
            .order("created_at", { ascending: true });

          if (!contacts || contacts.length === 0) {
            await db.from("warmup_audit_logs").insert({
              user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
              level: "warn", event_type: "autosave_no_contacts",
              message: "Nenhum contato Auto Save ativo",
            });
            break;
          }

          // Pick contact by index (wraps around)
          const contact = contacts[recipientIndex % contacts.length];
          const message = pickRandom(autosaveMessages);

          // Format phone for UAZAPI (remove +, add @s.whatsapp.net format if needed)
          const phoneNumber = contact.phone_e164.replace(/\+/g, "");

          await uazapiSendText(baseUrl, token, phoneNumber, message);

          // Track unique recipient
          const todayStr = new Date().toISOString().split("T")[0];
          await db.from("warmup_unique_recipients").insert({
            cycle_id: cycle.id,
            user_id: job.user_id,
            recipient_phone_e164: contact.phone_e164,
            day_date: todayStr,
          }).catch(() => {}); // Ignore duplicate

          // Update counters
          await db.from("warmup_cycles").update({
            daily_interaction_budget_used: (cycle.daily_interaction_budget_used || 0) + 1,
            daily_unique_recipients_used: (cycle.daily_unique_recipients_used || 0) + (msgIndex === 0 ? 1 : 0),
          }).eq("id", cycle.id);

          await db.from("warmup_audit_logs").insert({
            user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
            level: "info", event_type: "autosave_msg_sent",
            message: `Auto Save: msg ${msgIndex + 1}/3 para ${contact.contact_name || phoneNumber}`,
            meta: { phone: phoneNumber, msg_index: msgIndex },
          });
          break;
        }

        case "community_interaction": {
          // Send message between community pair instances
          if (!baseUrl || !token) {
            throw new Error("Credenciais UAZAPI não configuradas");
          }

          // Get community pairs for this cycle
          const { data: pairs } = await db
            .from("community_pairs")
            .select("id, instance_id_a, instance_id_b")
            .eq("cycle_id", cycle.id)
            .eq("status", "active");

          if (!pairs || pairs.length === 0) {
            // Try to create pairs by finding other active warmup instances
            const { data: otherCycles } = await db
              .from("warmup_cycles")
              .select("id, device_id, user_id")
              .eq("is_running", true)
              .neq("device_id", job.device_id)
              .in("phase", ["community_light", "community_enabled"])
              .limit(10);

            if (otherCycles && otherCycles.length > 0) {
              const pairTarget = pickRandom(otherCycles);
              // Get the partner device's number
              const { data: partnerDevice } = await db
                .from("devices")
                .select("number, status")
                .eq("id", pairTarget.device_id)
                .single();

              if (partnerDevice?.number && partnerDevice.status === "Ready") {
                const phoneNumber = partnerDevice.number.replace(/\+/g, "");
                const message = pickRandom(communityMessages);

                await uazapiSendText(baseUrl, token, phoneNumber, message);

                await db.from("warmup_cycles").update({
                  daily_interaction_budget_used: (cycle.daily_interaction_budget_used || 0) + 1,
                }).eq("id", cycle.id);

                await db.from("warmup_audit_logs").insert({
                  user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
                  level: "info", event_type: "community_msg_sent",
                  message: `Comunitário: msg para instância parceira (${phoneNumber.substring(0, 6)}...)`,
                  meta: { partner_device: pairTarget.device_id },
                });
              } else {
                await db.from("warmup_audit_logs").insert({
                  user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
                  level: "warn", event_type: "community_no_partner",
                  message: "Nenhum parceiro comunitário online encontrado",
                });
              }
            } else {
              await db.from("warmup_audit_logs").insert({
                user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
                level: "warn", event_type: "community_no_peers",
                message: "Nenhuma instância elegível para pareamento comunitário",
              });
            }
            break;
          }

          // Use existing pair
          const pair = pickRandom(pairs);
          const isA = pair.instance_id_a === job.device_id;
          const partnerId = isA ? pair.instance_id_b : pair.instance_id_a;

          const { data: partnerDevice } = await db
            .from("devices")
            .select("number, status")
            .eq("id", partnerId)
            .single();

          if (partnerDevice?.number && partnerDevice.status === "Ready") {
            const phoneNumber = partnerDevice.number.replace(/\+/g, "");
            const message = pickRandom(communityMessages);

            await uazapiSendText(baseUrl, token, phoneNumber, message);

            await db.from("warmup_cycles").update({
              daily_interaction_budget_used: (cycle.daily_interaction_budget_used || 0) + 1,
            }).eq("id", cycle.id);

            await db.from("warmup_audit_logs").insert({
              user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
              level: "info", event_type: "community_msg_sent",
              message: `Comunitário: msg para parceiro (pair ${pair.id.substring(0, 8)})`,
              meta: { pair_id: pair.id, partner_device: partnerId },
            });
          }
          break;
        }

        case "enable_autosave": {
          const { count } = await db
            .from("warmup_autosave_contacts")
            .select("id", { count: "exact", head: true })
            .eq("user_id", job.user_id)
            .eq("is_active", true);

          if (count && count > 0) {
            await db.from("warmup_cycles").update({ phase: "autosave_enabled" }).eq("id", cycle.id);
            await db.from("warmup_audit_logs").insert({
              user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
              level: "info", event_type: "phase_changed",
              message: `Auto Save habilitado (${count} contatos ativos)`,
              meta: { active_contacts: count },
            });
          } else {
            await db.from("warmup_audit_logs").insert({
              user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
              level: "warn", event_type: "autosave_missing",
              message: "Auto Save não habilitado: nenhum contato ativo",
            });
            // Retry in 6 hours
            await db.from("warmup_jobs").insert({
              user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
              job_type: "enable_autosave", payload: {},
              run_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), status: "pending",
            });
          }
          break;
        }

        case "enable_community": {
          if (!["autosave_enabled", "community_light"].includes(cycle.phase)) {
            await db.from("warmup_audit_logs").insert({
              user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
              level: "warn", event_type: "community_blocked",
              message: "Comunidade bloqueada: fase pré-requisito não ativa",
            });
            break;
          }
          const targetPhase = job.payload?.target_phase || "community_light";
          await db.from("warmup_cycles").update({ phase: targetPhase }).eq("id", cycle.id);
          await db.from("warmup_audit_logs").insert({
            user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
            level: "info", event_type: "phase_changed",
            message: `Comunidade habilitada: ${targetPhase}`,
          });
          break;
        }

        case "daily_reset": {
          const newDay = Math.min(cycle.day_index + 1, cycle.days_total);

          // Check if cycle is complete
          if (newDay > cycle.days_total) {
            await db.from("warmup_cycles").update({
              is_running: false, phase: "completed",
              daily_interaction_budget_used: 0, daily_unique_recipients_used: 0,
            }).eq("id", cycle.id);
            await db.from("warmup_audit_logs").insert({
              user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
              level: "info", event_type: "cycle_completed",
              message: `Ciclo concluído após ${cycle.days_total} dias 🎉`,
            });
            break;
          }

          // Determine new phase based on day
          const newPhase = getPhaseForDay(newDay);

          // Set budgets based on phase
          let budgetMin = 200, budgetMax = 500;
          if (newPhase === "pre_24h") { budgetMin = 5; budgetMax = 10; }

          const newTarget = randInt(budgetMin, budgetMax);

          await db.from("warmup_cycles").update({
            daily_interaction_budget_used: 0,
            daily_unique_recipients_used: 0,
            daily_interaction_budget_target: newTarget,
            daily_interaction_budget_min: budgetMin,
            daily_interaction_budget_max: budgetMax,
            day_index: newDay,
            phase: newPhase,
            last_daily_reset_at: new Date().toISOString(),
          }).eq("id", cycle.id);

          await db.from("warmup_audit_logs").insert({
            user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
            level: "info", event_type: "daily_reset",
            message: `Reset diário: dia ${newDay}/${cycle.days_total}, fase: ${newPhase}, budget: ${newTarget}`,
            meta: { day: newDay, phase: newPhase, budget_target: newTarget },
          });

          // Schedule today's interaction jobs
          await scheduleDayJobs(db, cycle.id, job.user_id, job.device_id, newDay, newPhase);

          // Schedule next daily_reset
          const nextReset = new Date();
          nextReset.setUTCDate(nextReset.getUTCDate() + 1);
          nextReset.setUTCHours(3, 5, 0, 0);
          await db.from("warmup_jobs").insert({
            user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
            job_type: "daily_reset", payload: {}, run_at: nextReset.toISOString(), status: "pending",
          });
          break;
        }

        case "health_check": {
          await db.from("warmup_audit_logs").insert({
            user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
            level: "info", event_type: "health_check", message: "Health check OK",
          });
          break;
        }

        default: {
          await db.from("warmup_audit_logs").insert({
            user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
            level: "warn", event_type: "unknown_job_type",
            message: `Tipo desconhecido: ${job.job_type}`,
          });
        }
      }

      await db.from("warmup_jobs").update({
        status: "succeeded", attempts: job.attempts + 1,
      }).eq("id", job.id);
      succeeded++;

    } catch (jobErr) {
      failed++;
      const newAttempts = job.attempts + 1;
      if (newAttempts < job.max_attempts) {
        const retryAt = new Date(Date.now() + backoffMinutes(newAttempts) * 60 * 1000);
        await db.from("warmup_jobs").update({
          status: "pending", attempts: newAttempts,
          last_error: jobErr.message, run_at: retryAt.toISOString(),
        }).eq("id", job.id);
      } else {
        await db.from("warmup_jobs").update({
          status: "failed", attempts: newAttempts, last_error: jobErr.message,
        }).eq("id", job.id);
      }
      await db.from("warmup_audit_logs").insert({
        user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
        level: "error", event_type: "job_failed",
        message: `Job ${job.job_type} falhou: ${jobErr.message}`,
        meta: { job_id: job.id, attempts: newAttempts },
      }).catch(() => {});
    }
  }

  const { data: nextPending } = await db
    .from("warmup_jobs")
    .select("run_at")
    .eq("status", "pending")
    .order("run_at", { ascending: true })
    .limit(1);

  console.log(`[warmup-tick] Processed: ${succeeded + failed}, succeeded: ${succeeded}, failed: ${failed}`);

  return json({
    ok: true,
    processed_jobs_count: succeeded + failed,
    succeeded,
    failed,
    next_pending_run_at: nextPending?.[0]?.run_at || null,
  });
}

// ════════════════════════════════════════
// Schedule jobs for a specific day/phase
// ════════════════════════════════════════
async function scheduleDayJobs(
  db: any,
  cycleId: string,
  userId: string,
  deviceId: string,
  dayIndex: number,
  phase: string,
) {
  const now = new Date();
  const jobs: any[] = [];

  // Activity window: 07:00-19:00 BRT = 10:00-22:00 UTC
  const today = new Date(now);
  const windowStartUTC = new Date(today);
  windowStartUTC.setUTCHours(10, 0, 0, 0);
  const windowEndUTC = new Date(today);
  windowEndUTC.setUTCHours(22, 0, 0, 0);

  const effectiveStart = Math.max(now.getTime(), windowStartUTC.getTime());
  const effectiveEnd = windowEndUTC.getTime();

  if (effectiveStart >= effectiveEnd) return 0;

  const windowMs = effectiveEnd - effectiveStart;

  // ── GROUP INTERACTIONS (Day 2+) ──
  if (["groups_only", "autosave_enabled", "community_light", "community_enabled"].includes(phase)) {
    const groupMsgCount = randInt(200, 500);
    const groupSpacingMs = windowMs / groupMsgCount;

    for (let i = 0; i < groupMsgCount; i++) {
      const baseOffset = groupSpacingMs * i;
      const jitter = randInt(0, Math.floor(groupSpacingMs * 0.6));
      const runAt = new Date(effectiveStart + baseOffset + jitter);
      if (runAt.getTime() > effectiveEnd) break;

      jobs.push({
        user_id: userId, device_id: deviceId, cycle_id: cycleId,
        job_type: "group_interaction", payload: {},
        run_at: runAt.toISOString(), status: "pending",
      });
    }
  }

  // ── AUTOSAVE INTERACTIONS (Day 3+) ──
  if (["autosave_enabled", "community_light", "community_enabled"].includes(phase)) {
    const autosaveCount = 15; // 5 numbers × 3 msgs
    const asSpacingMs = windowMs / autosaveCount;

    for (let i = 0; i < autosaveCount; i++) {
      const baseOffset = asSpacingMs * i;
      const jitter = randInt(0, Math.floor(asSpacingMs * 0.4));
      const runAt = new Date(effectiveStart + baseOffset + jitter);
      if (runAt.getTime() > effectiveEnd) break;

      jobs.push({
        user_id: userId, device_id: deviceId, cycle_id: cycleId,
        job_type: "autosave_interaction",
        payload: { recipient_index: Math.floor(i / 3), msg_index: i % 3 },
        run_at: runAt.toISOString(), status: "pending",
      });
    }
  }

  // ── COMMUNITY INTERACTIONS (Day 5+) ──
  if (phase === "community_light") {
    const communityPairs = randInt(3, 5);
    const msgsPerPair = randInt(15, 30);
    const totalCommunityMsgs = communityPairs * msgsPerPair;
    const cmSpacingMs = windowMs / totalCommunityMsgs;

    for (let i = 0; i < totalCommunityMsgs; i++) {
      const pairIndex = Math.floor(i / msgsPerPair);
      const baseOffset = cmSpacingMs * i;
      const jitter = randInt(0, Math.floor(cmSpacingMs * 0.3));
      const runAt = new Date(effectiveStart + baseOffset + jitter);
      if (runAt.getTime() > effectiveEnd) break;

      jobs.push({
        user_id: userId, device_id: deviceId, cycle_id: cycleId,
        job_type: "community_interaction",
        payload: { pair_index: pairIndex, pairs_total: communityPairs, msgs_per_pair: msgsPerPair },
        run_at: runAt.toISOString(), status: "pending",
      });
    }
  }

  if (phase === "community_enabled") {
    const communityPairs = randInt(5, 10);
    const msgsPerPair = randInt(15, 30);
    const totalCommunityMsgs = communityPairs * msgsPerPair;
    const cmSpacingMs = windowMs / totalCommunityMsgs;

    for (let i = 0; i < totalCommunityMsgs; i++) {
      const pairIndex = Math.floor(i / msgsPerPair);
      const baseOffset = cmSpacingMs * i;
      const jitter = randInt(0, Math.floor(cmSpacingMs * 0.3));
      const runAt = new Date(effectiveStart + baseOffset + jitter);
      if (runAt.getTime() > effectiveEnd) break;

      jobs.push({
        user_id: userId, device_id: deviceId, cycle_id: cycleId,
        job_type: "community_interaction",
        payload: { pair_index: pairIndex, pairs_total: communityPairs, msgs_per_pair: msgsPerPair },
        run_at: runAt.toISOString(), status: "pending",
      });
    }
  }

  if (jobs.length > 0) {
    for (let i = 0; i < jobs.length; i += 100) {
      const batch = jobs.slice(i, i + 100);
      await db.from("warmup_jobs").insert(batch);
    }
  }

  console.log(`[warmup-tick] Scheduled ${jobs.length} jobs for day ${dayIndex} (${phase})`);
  return jobs.length;
}

// ════════════════════════════════════════
// DAILY RESET HANDLER
// ════════════════════════════════════════
async function handleDailyReset(db: any) {
  const { data: activeCycles } = await db
    .from("warmup_cycles")
    .select("id, user_id, device_id")
    .eq("is_running", true)
    .neq("phase", "completed")
    .neq("phase", "paused");

  if (!activeCycles || activeCycles.length === 0) {
    return json({ ok: true, message: "No active cycles", scheduled: 0 });
  }

  const now = new Date().toISOString();
  const jobs = activeCycles.map((c: any) => ({
    user_id: c.user_id,
    device_id: c.device_id,
    cycle_id: c.id,
    job_type: "daily_reset",
    payload: {},
    run_at: now,
    status: "pending",
  }));

  const { error } = await db.from("warmup_jobs").insert(jobs);
  if (error) throw error;

  console.log(`[warmup-tick] Daily reset scheduled for ${jobs.length} cycles`);
  return json({ ok: true, scheduled: jobs.length });
}

function json(data: any) {
  return new Response(JSON.stringify(data), {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
      "Content-Type": "application/json",
    },
  });
}
