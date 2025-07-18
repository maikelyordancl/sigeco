"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { toast } from "react-hot-toast";
import MainLayout from "@/components/Layout/MainLayout";
import { Plus, Calendar, MapPin, Search } from "lucide-react";
import { EstadoEvento, Evento, estadosEvento } from "./types"
import { mapEstado, reverseMapEstado, getBadgeColor } from "./utils"

const validationSchema = Yup.object().shape({
  id_evento: Yup.number().optional(),
  nombre: Yup.string().required("El nombre del evento es obligatorio."),
  fecha_inicio: Yup.string().required("La fecha de inicio es obligatoria."),
  fecha_fin: Yup.string()
    .required("La fecha de finalización es obligatoria.")
    .test("is-after", "La fecha de finalización debe ser posterior a la fecha de inicio.", function (value) {
      const { fecha_inicio } = this.parent;
      return new Date(value) > new Date(fecha_inicio);
    }),
  ciudad: Yup.string().required("La ciudad es obligatoria."),
  lugar: Yup.string().required("El lugar del evento es obligatorio."),
  presupuesto_marketing: Yup.number().optional(),
  estado: Yup.string().oneOf(estadosEvento, "Estado no válido.").required("El estado del evento es obligatorio."),
});

export default function GestionEventos() {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [selectedEvento, setSelectedEvento] = useState<Evento | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null);  // Para errores generales
  const [errorModal, setErrorModal] = useState<string | null>(null);    // Para errores en el modal
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [eventoToDelete, setEventoToDelete] = useState<Evento | null>(null);
  const [presupuesto, setPresupuesto] = useState("");

  useEffect(() => {
    if (selectedEvento?.presupuesto_marketing) {
      setPresupuesto(new Intl.NumberFormat("es-CL").format(selectedEvento.presupuesto_marketing ?? 0));
    }
  }, [selectedEvento]);

  const handlePresupuestoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ""); // Solo números
    setPresupuesto(new Intl.NumberFormat("es-CL").format(Number(value))); // Formatea con separadores de miles
  };

  const { register, handleSubmit, reset, formState: { errors } } = useForm<Evento>({
    resolver: yupResolver(validationSchema),
    defaultValues: selectedEvento || {
      id_evento: 0,
      nombre: "",
      fecha_inicio: "",
      fecha_fin: "",
      ciudad: "",
      lugar: "",
      presupuesto_marketing: 0,
      estado: "Activo",
    },
  });

  useEffect(() => {
    if (selectedEvento) {
      reset(selectedEvento);
    }
  }, [selectedEvento, reset]);

  const fetchEventos = useCallback(async () => {
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/eventos`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const eventosMapeados = data.data.map((evento: Evento) => ({
            id_evento: evento.id_evento,
            nombre: evento.nombre,
            fecha_inicio: evento.fecha_inicio,
            fecha_fin: evento.fecha_fin,
            ciudad: evento.ciudad,
            lugar: evento.lugar,
            presupuesto_marketing: evento.presupuesto_marketing,
            estado: mapEstado(Number(evento.estado)),
          }));
          setEventos(eventosMapeados);
          setErrorGlobal(null);
        } else {
          setErrorGlobal(data.error || "Error desconocido al obtener los eventos.");
        }
      } else {
        setErrorGlobal("Error al obtener los eventos desde el servidor.");
      }
    } catch (error) {
      setErrorGlobal("Error de red: No se pudo conectar al servidor.");
      console.error("Error de red:", error);
    }
  }, []);

useEffect(() => {
  const obtenerEventos = async () => {
    try {
      await fetchEventos();
    } catch (error) {
      console.error("Error inesperado al obtener eventos:", error);
    }
  };

  obtenerEventos().catch((error) => console.error("Error inesperado:", error));
}, [fetchEventos]);


  const handleOpenModal = (evento?: Evento) => {
    setSelectedEvento(evento || {
      id_evento: 0,
      nombre: "",
      fecha_inicio: "",
      fecha_fin: "",
      ciudad: "",
      lugar: "",
      presupuesto_marketing: 0,
      estado: "Activo",
    });
    setPresupuesto(new Intl.NumberFormat("es-CL").format(evento ? evento.presupuesto_marketing ?? 0 : 0));
    setIsModalOpen(true);
  };

  const handleSaveEvento = async (data: Evento) => {
    const token = localStorage.getItem("token");

    if (!token) {
      toast.error("No hay token de autenticación. Inicie sesión nuevamente.");
      return;
    }
    
    // Determina la URL y el método (Crear vs. Editar)
    const isEditing = !!data.id_evento;
    const url = isEditing
      ? `${process.env.NEXT_PUBLIC_API_URL}/eventos?id=${data.id_evento}`
      : `${process.env.NEXT_PUBLIC_API_URL}/eventos`;
    const metodo = isEditing ? "PUT" : "POST";

    // Limpia y convierte el presupuesto a número
    const presupuestoNumerico = Number(presupuesto.replace(/\./g, ""));

    const payload = {
      nombre: data.nombre,
      fecha_inicio: data.fecha_inicio,
      fecha_fin: data.fecha_fin,
      ciudad: data.ciudad,
      lugar: data.lugar,
      presupuesto_marketing: presupuestoNumerico,
      estado: reverseMapEstado(data.estado), // Convierte el estado de texto a número
    };

    try {
      const response = await fetch(url, {
        method: metodo,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setIsModalOpen(false);
        toast.success(isEditing ? "Evento actualizado con éxito." : "Evento creado con éxito.");
        
        // Refresca la lista de eventos para mostrar los cambios
        await fetchEventos();

      } else {
        // --- MANEJO DE ERRORES MEJORADO ---
        if (result.errors && Array.isArray(result.errors)) {
          // Si el backend envió un array de errores de validación, muéstralos.
          result.errors.forEach((err: any) => {
            toast.error(err.msg, { duration: 2500 }); // Muestra un toast por cada error específico
          });
        } else {
          // Si es otro tipo de error del servidor.
          toast.error(result.error || "Ocurrió un error al guardar el evento.");
        }
        // --- FIN DEL MANEJO DE ERRORES ---
      }
    } catch (error) {
      toast.error("Error de red al intentar guardar el evento.");
      console.error("Error de red:", error);
    }
  };

  const handleDeleteEvento = async () => {
  if (!eventoToDelete) return;

  const token = localStorage.getItem("token");
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/eventos/${eventoToDelete.id_evento}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    const result = await response.json();

    if (response.ok && result.success) {
      toast.success("Evento eliminado con éxito.");
      setIsDeleteConfirmOpen(false);
      setEventoToDelete(null);

      await fetchEventos().catch(() => {
        toast.error("Error al actualizar la lista de eventos después de eliminar.");
      });
    } else {
      toast.error(result.error || "Error al eliminar el evento.");
    }
  } catch (error) {
    toast.error("Error de red al intentar eliminar el evento. " + error);
  }
};

  return (
    <MainLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Gestión de Eventos</h1>
          <Button onClick={() => handleOpenModal()} className="flex items-center space-x-2">
            <Plus size={20} />
            <span>Crear Evento</span>
          </Button>
        </div>

        <div className="flex items-center mb-6 space-x-2">
          <Input
            placeholder="Buscar eventos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
          <Button variant="outline">
            <Search size={20} />
          </Button>
        </div>

        {errorGlobal ? (
          <div className="text-red-500 text-center mb-4">{errorGlobal}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {eventos
              // Filtrar eventos según el término de búsqueda
              .filter((evento) =>
                evento.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                evento.ciudad.toLowerCase().includes(searchTerm.toLowerCase()) ||
                evento.lugar.toLowerCase().includes(searchTerm.toLowerCase())
              )
              // Ordenar eventos según el estado y el ID (como ya tenías)
              .sort((a, b) => {
                const prioridadEstado: Record<EstadoEvento, number> = {
                  "Activo": 1,
                  "En Proceso": 2,
                  "Finalizado": 3,
                  "Cancelado": 4,
                };

                if (prioridadEstado[a.estado] === prioridadEstado[b.estado]) {
                  return b.id_evento! - a.id_evento!;
                }
                return prioridadEstado[a.estado] - prioridadEstado[b.estado];
              })
              .map((evento) => (
              <Card key={evento.id_evento || evento.nombre} className="shadow-md hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    {evento.nombre}
                    <Badge className={getBadgeColor(evento.estado)}>
                      {evento.estado}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2 mb-2">
                    <Calendar size={16} />
                    <span>
                      {new Date(evento.fecha_inicio).toLocaleDateString("es-ES")} - {new Date(evento.fecha_fin).toLocaleDateString("es-ES")}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin size={16} />
                    <span>{evento.ciudad} - {evento.lugar}</span>
                  </div>
                  <div className="mt-4 flex justify-between">
                    <Button size="sm" variant="outline" onClick={() => handleOpenModal(evento)}>
                      Ver / Editar
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => { setEventoToDelete(evento); setIsDeleteConfirmOpen(true); }}>
                      Eliminar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedEvento?.id_evento ? "Editar Evento" : "Crear Evento"}</DialogTitle>
            </DialogHeader>

            {errorGlobal && (
              <div className="bg-red-100 text-red-700 p-3 rounded-md shadow-sm mb-4 text-center">
                {errorGlobal}
              </div>
            )}

            <form onSubmit={handleSubmit(handleSaveEvento)} className="space-y-4">
                {(errorModal || Object.keys(errors).length > 0) && (
                  <div className="bg-red-100 text-red-700 p-3 rounded-md shadow-sm">
                    {/* Mostrar error del servidor si existe */}
                    {errorModal && <p>{errorModal}</p>}

                    {/* Mostrar errores de validación del formulario */}
                    {errors.nombre && <p>{errors.nombre.message}</p>}
                    {errors.fecha_inicio && <p>{errors.fecha_inicio.message}</p>}
                    {errors.fecha_fin && <p>{errors.fecha_fin.message}</p>}
                    {errors.ciudad && <p>{errors.ciudad.message}</p>}
                    {errors.lugar && <p>{errors.lugar.message}</p>}
                  </div>
                )}
              <Input {...register("nombre")} placeholder="Nombre del Evento" />
              <div className="flex space-x-2">
                <Input type="date" {...register("fecha_inicio")} />
                <Input type="date" {...register("fecha_fin")} />
              </div>
              <Input {...register("ciudad")} placeholder="Ciudad" />
              <Input {...register("lugar")} placeholder="Lugar" />
              <Input
  type="text"
  value={presupuesto}
  onChange={handlePresupuestoChange}
  placeholder="Presupuesto Marketing"
/>
              <Select
              {...register("estado")}
              value={selectedEvento?.estado} // Asegura que el estado actual se refleje
              onValueChange={(value) => setSelectedEvento((prev) => prev ? { ...prev, estado: value as EstadoEvento } : null)}
              disabled={!selectedEvento?.id_evento}  // Desactiva si es un nuevo evento
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona un estado" />
              </SelectTrigger>
              <SelectContent>
                {estadosEvento.map((estado) => (
                  <SelectItem key={estado} value={estado}>
                    {estado}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

              <DialogFooter>
                <Button type="submit">Guardar</Button>
              </DialogFooter>
            </form>


          </DialogContent>
        </Dialog>

        <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>¿Estás seguro de que deseas eliminar este evento y todo lo asociado a él?</DialogTitle>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>Cancelar</Button>
              <Button variant="destructive" onClick={handleDeleteEvento}>Eliminar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
