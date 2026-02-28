import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export interface Campaign {
  id: string;
  name: string;
  status: string;
  message_type: string;
  message_content: string | null;
  media_url: string | null;
  buttons: any[];
  template_id: string | null;
  total_contacts: number;
  sent_count: number;
  delivered_count: number;
  failed_count: number;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  min_delay_seconds: number;
  max_delay_seconds: number;
  pause_every_min: number;
  pause_every_max: number;
  pause_duration_min: number;
  pause_duration_max: number;
  device_id: string | null;
}

export interface CampaignContact {
  id: string;
  campaign_id: string;
  contact_id: string | null;
  phone: string;
  name: string | null;
  status: string;
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
}

export function useCampaigns() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["campaigns", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Campaign[];
    },
    enabled: !!user,
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (campaign: {
      name: string;
      message_type: string;
      message_content?: string;
      media_url?: string;
      buttons?: any[];
      template_id?: string;
      scheduled_at?: string;
      min_delay_seconds?: number;
      max_delay_seconds?: number;
      pause_every_min?: number;
      pause_every_max?: number;
      pause_duration_min?: number;
      pause_duration_max?: number;
      device_id?: string;
      contacts: { phone: string; name?: string }[];
    }) => {
      const { contacts, ...campaignData } = campaign;

      // Validate device_id exists before inserting
      let validDeviceId: string | null = null;
      if (campaignData.device_id) {
        const { data: deviceCheck } = await supabase
          .from("devices")
          .select("id")
          .eq("id", campaignData.device_id)
          .maybeSingle();
        if (deviceCheck) {
          validDeviceId = deviceCheck.id;
        }
      }

      const { data: newCampaign, error: campError } = await supabase
        .from("campaigns")
        .insert({
          name: campaignData.name,
          message_type: campaignData.message_type,
          message_content: campaignData.message_content || null,
          media_url: campaignData.media_url || null,
          buttons: campaignData.buttons || [],
          template_id: campaignData.template_id || null,
          scheduled_at: campaignData.scheduled_at || null,
          min_delay_seconds: campaignData.min_delay_seconds ?? 8,
          max_delay_seconds: campaignData.max_delay_seconds ?? 25,
          pause_every_min: campaignData.pause_every_min ?? 10,
          pause_every_max: campaignData.pause_every_max ?? 20,
          pause_duration_min: campaignData.pause_duration_min ?? 30,
          pause_duration_max: campaignData.pause_duration_max ?? 120,
          device_id: validDeviceId,
          user_id: user!.id,
          total_contacts: contacts.length,
          status: campaignData.scheduled_at ? "scheduled" : "pending",
        })
        .select()
        .single();
      if (campError) throw campError;

      if (contacts.length > 0) {
        const contactRows = contacts.map(c => ({
          campaign_id: newCampaign.id,
          phone: c.phone,
          name: c.name || null,
        }));
        const { error: contactsError } = await supabase
          .from("campaign_contacts")
          .insert(contactRows);
        if (contactsError) throw contactsError;
      }

      return newCampaign;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["campaigns"] }),
  });
}

export function useStartCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ campaignId, deviceId }: { campaignId: string; deviceId?: string }) => {
      const { data, error } = await supabase.functions.invoke("process-campaign", {
        body: { action: "start", campaignId, deviceId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["campaigns"] }),
  });
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["campaigns"] }),
  });
}
