"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, Pin, Plus, Save, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { assertNotificationInsertSucceeded, buildNotificationRows } from "@/lib/notifications/internal";
import {
  buildHomeMessageNotification,
  type HomeMessage,
  type HomeMessageTone,
} from "@/lib/home-messages/messages";

type EditableHomeMessage = HomeMessage & {
  created_by: string | null;
  updated_by: string | null;
};

const emptyNewMessage = {
  title: "",
  body: "",
  link_label: "",
  link_href: "",
  tone: "info" as HomeMessageTone,
  is_published: true,
  is_pinned: true,
};

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || `mensaje-${Date.now()}`
  );
}

function toneLabel(tone: HomeMessageTone) {
  const labels: Record<HomeMessageTone, string> = {
    info: "Info",
    payment: "Pago",
    warning: "Aviso",
    success: "OK",
  };
  return labels[tone];
}

export default function AdminMensajesPage() {
  const [messages, setMessages] = useState<EditableHomeMessage[]>([]);
  const [newMessage, setNewMessage] = useState(emptyNewMessage);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();
  const supabase = useMemo(() => createClient(), []);

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from("home_messages")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      toast({ title: "Error al cargar mensajes", description: error.message, variant: "destructive" });
      return;
    }

    setMessages((data || []) as EditableHomeMessage[]);
  };

  useEffect(() => {
    void loadMessages().finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const notifyPublishedMessage = async (message: HomeMessage) => {
    if (!message.is_published) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profiles } = await supabase.from("profiles").select("id");
    const notification = buildHomeMessageNotification(message);
    const rows = buildNotificationRows({
      profiles: (profiles || []) as Array<{ id: string }>,
      type: "admin_update",
      actorUserId: user.id,
      title: notification.title,
      body: notification.body,
      link: notification.link,
    });

    if (rows.length > 0) {
      assertNotificationInsertSucceeded(
        await supabase.from("notifications").insert(rows),
        "No se pudieron crear las notificaciones del mensaje"
      );
    }
  };

  const updateMessage = (id: string, updates: Partial<EditableHomeMessage>) => {
    setMessages((prev) => prev.map((message) => (message.id === id ? { ...message, ...updates } : message)));
  };

  const saveMessage = async (message: EditableHomeMessage) => {
    if (!message.title.trim() || !message.body.trim()) {
      toast({
        title: "Faltan datos",
        description: "El titulo y el cuerpo del mensaje son obligatorios.",
        variant: "destructive",
      });
      return;
    }

    setSavingId(message.id);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("home_messages")
        .update({
          title: message.title.trim(),
          body: message.body.trim(),
          link_label: message.link_label?.trim() || null,
          link_href: message.link_href?.trim() || null,
          tone: message.tone,
          is_published: message.is_published,
          is_pinned: message.is_pinned,
          updated_by: user?.id ?? null,
        })
        .eq("id", message.id)
        .select("*")
        .single();

      if (error) throw error;

      const saved = data as EditableHomeMessage;
      setMessages((prev) => prev.map((item) => (item.id === saved.id ? saved : item)));
      await notifyPublishedMessage(saved);
      toast({ title: "Mensaje guardado" });
    } catch (error) {
      toast({
        title: "Error al guardar",
        description: error instanceof Error ? error.message : "No se pudo guardar el mensaje.",
        variant: "destructive",
      });
    } finally {
      setSavingId(null);
    }
  };

  const sendNotificationAgain = async (message: EditableHomeMessage) => {
    setSavingId(message.id);
    try {
      await notifyPublishedMessage(message);
      toast({ title: "Notificacion enviada" });
    } catch (error) {
      toast({
        title: "Error al notificar",
        description: error instanceof Error ? error.message : "No se pudo enviar la notificacion.",
        variant: "destructive",
      });
    } finally {
      setSavingId(null);
    }
  };

  const createMessage = async () => {
    if (!newMessage.title.trim() || !newMessage.body.trim()) {
      toast({
        title: "Faltan datos",
        description: "El titulo y el cuerpo del mensaje son obligatorios.",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("home_messages")
        .insert({
          slug: slugify(newMessage.title),
          title: newMessage.title.trim(),
          body: newMessage.body.trim(),
          link_label: newMessage.link_label.trim() || null,
          link_href: newMessage.link_href.trim() || null,
          tone: newMessage.tone,
          is_published: newMessage.is_published,
          is_pinned: newMessage.is_pinned,
          created_by: user?.id ?? null,
          updated_by: user?.id ?? null,
        })
        .select("*")
        .single();

      if (error) throw error;

      const created = data as EditableHomeMessage;
      setMessages((prev) => [created, ...prev]);
      setNewMessage(emptyNewMessage);
      await notifyPublishedMessage(created);
      toast({ title: "Mensaje creado" });
    } catch (error) {
      toast({
        title: "Error al crear",
        description: error instanceof Error ? error.message : "No se pudo crear el mensaje.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const deleteMessage = async (message: EditableHomeMessage) => {
    if (message.slug === "payment-info" || message.slug === "install-info") {
      toast({
        title: "Mensaje protegido",
        description: "Los mensajes de pago e instalacion se pueden editar o despublicar, pero no eliminar.",
        variant: "destructive",
      });
      return;
    }

    setSavingId(message.id);
    try {
      const { error } = await supabase.from("home_messages").delete().eq("id", message.id);
      if (error) throw error;
      setMessages((prev) => prev.filter((item) => item.id !== message.id));
      toast({ title: "Mensaje eliminado" });
    } catch (error) {
      toast({
        title: "Error al eliminar",
        description: error instanceof Error ? error.message : "No se pudo eliminar el mensaje.",
        variant: "destructive",
      });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-marcador text-2xl font-bold uppercase tracking-wide text-ink">Mensajes</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Publica avisos en la pantalla principal y edita los textos de pago e instalacion.
          </p>
        </div>
        <Badge variant="outline">{messages.length} mensajes</Badge>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Nuevo mensaje</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Titulo</Label>
              <Input value={newMessage.title} onChange={(event) => setNewMessage((prev) => ({ ...prev, title: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Tono</Label>
              <Select value={newMessage.tone} onValueChange={(tone) => setNewMessage((prev) => ({ ...prev, tone: tone as HomeMessageTone }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="payment">Pago</SelectItem>
                  <SelectItem value="warning">Aviso</SelectItem>
                  <SelectItem value="success">OK</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Mensaje</Label>
            <textarea
              value={newMessage.body}
              onChange={(event) => setNewMessage((prev) => ({ ...prev, body: event.target.value }))}
              className="min-h-24 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink outline-none ring-offset-cream focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              value={newMessage.link_label}
              onChange={(event) => setNewMessage((prev) => ({ ...prev, link_label: event.target.value }))}
              placeholder="Texto del enlace opcional"
            />
            <Input
              value={newMessage.link_href}
              onChange={(event) => setNewMessage((prev) => ({ ...prev, link_href: event.target.value }))}
              placeholder="/ruta-del-enlace"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <Label className="flex items-center gap-2">
                <Switch checked={newMessage.is_published} onCheckedChange={(is_published) => setNewMessage((prev) => ({ ...prev, is_published }))} />
                Publicado
              </Label>
              <Label className="flex items-center gap-2">
                <Switch checked={newMessage.is_pinned} onCheckedChange={(is_pinned) => setNewMessage((prev) => ({ ...prev, is_pinned }))} />
                Fijado
              </Label>
            </div>
            <Button onClick={createMessage} disabled={creating}>
              <Plus className="h-4 w-4" />
              Crear
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {loading && <p className="py-8 text-center text-sm text-ink-muted">Cargando mensajes...</p>}

        {messages.map((message) => (
          <Card key={message.id}>
            <CardContent className="space-y-4 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={message.is_published ? "success-soft" : "outline"}>
                    {message.is_published ? "Publicado" : "Oculto"}
                  </Badge>
                  {message.is_pinned && (
                    <Badge variant="info">
                      <Pin className="mr-1 h-3 w-3" />
                      Fijado
                    </Badge>
                  )}
                  <Badge variant="secondary">{toneLabel(message.tone)}</Badge>
                  <span className="text-xs text-ink-faint">{message.slug}</span>
                </div>
                <span className="text-xs text-ink-faint">
                  {new Date(message.updated_at).toLocaleString("es-ES")}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_150px]">
                <div className="space-y-1.5">
                  <Label>Titulo</Label>
                  <Input value={message.title} onChange={(event) => updateMessage(message.id, { title: event.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Tono</Label>
                  <Select value={message.tone} onValueChange={(tone) => updateMessage(message.id, { tone: tone as HomeMessageTone })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="payment">Pago</SelectItem>
                      <SelectItem value="warning">Aviso</SelectItem>
                      <SelectItem value="success">OK</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Mensaje</Label>
                <textarea
                  value={message.body}
                  onChange={(event) => updateMessage(message.id, { body: event.target.value })}
                  className="min-h-28 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink outline-none ring-offset-cream focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  value={message.link_label ?? ""}
                  onChange={(event) => updateMessage(message.id, { link_label: event.target.value })}
                  placeholder="Texto del enlace opcional"
                />
                <Input
                  value={message.link_href ?? ""}
                  onChange={(event) => updateMessage(message.id, { link_href: event.target.value })}
                  placeholder="/ruta-del-enlace"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <Label className="flex items-center gap-2">
                    <Switch checked={message.is_published} onCheckedChange={(is_published) => updateMessage(message.id, { is_published })} />
                    Publicado
                  </Label>
                  <Label className="flex items-center gap-2">
                    <Switch checked={message.is_pinned} onCheckedChange={(is_pinned) => updateMessage(message.id, { is_pinned })} />
                    Fijado
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => void saveMessage(message)} disabled={savingId === message.id}>
                    <Save className="h-4 w-4" />
                    Guardar
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => void sendNotificationAgain(message)}
                    disabled={!message.is_published || savingId === message.id}
                  >
                    <Bell className="h-4 w-4" />
                    Notificar
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-ink-faint hover:bg-red/10 hover:text-red"
                    onClick={() => void deleteMessage(message)}
                    disabled={savingId === message.id}
                    aria-label="Eliminar mensaje"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
