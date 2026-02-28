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
      contacts: { phone: string; name?: string }[];
    }) => {
      const { contacts, ...campaignData } = campaign;

      // Create campaign
      const { data: newCampaign, error: campError } = await supabase
        .from("campaigns")
        .insert({
          ...campaignData,
          user_id: user!.id,
          buttons: campaignData.buttons || [],
          total_contacts: contacts.length,
          status: campaignData.scheduled_at ? "scheduled" : "pending",
        })
        .select()
        .single();
      if (campError) throw campError;

      // Add campaign contacts
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
