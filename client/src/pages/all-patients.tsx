import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Calendar, MessageSquare, FileText, User, Search, PlusCircle, Loader2 } from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { type Patient } from '@shared/schema';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const AllPatients = () => {
  const { user, refetchUser } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Refrescar datos al cargar la página
  useEffect(() => {
    if (refetchUser) {
      refetchUser();
    }
  }, [refetchUser]);

  // Obtener todos los pacientes del psicólogo
  const { data: patients, isLoading } = useQuery<Patient[]>({
    queryKey: ['/api/patients'],
  });

  // Filtro de búsqueda
  const filteredPatients = patients?.filter(patient => 
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (patient.phone && patient.phone.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Mis Pacientes</h1>
            <p className="text-muted-foreground">
              Gestiona todos tus pacientes en un solo lugar
            </p>
          </div>
          <Link href="/profile?tab=patients">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuevo Paciente
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle>Lista de Pacientes</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar paciente..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <CardDescription>
              Tienes {patients?.length || 0} pacientes registrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredPatients && filteredPatients.length > 0 ? (
              <ScrollArea className="h-[calc(100vh-280px)]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Contacto</TableHead>
                      <TableHead>Notas</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPatients.map((patient) => (
                      <TableRow key={patient.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>
                                {patient.name.split(' ').map((name: string) => name[0]).join('').substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{patient.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Desde {new Date(patient.created_at).toLocaleDateString('es-ES')}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p>{patient.email}</p>
                            <p className="text-muted-foreground">{patient.phone || 'Sin teléfono'}</p>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {patient.notes || 'Sin notas'}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/appointments?patient=${patient.id}`}>
                                <Calendar className="h-4 w-4 mr-1" />
                                <span className="sr-only md:not-sr-only md:ml-1 md:text-xs">Citas</span>
                              </Link>
                            </Button>
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/messages?patient=${patient.id}`}>
                                <MessageSquare className="h-4 w-4 mr-1" />
                                <span className="sr-only md:not-sr-only md:ml-1 md:text-xs">Mensajes</span>
                              </Link>
                            </Button>
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/consent-forms?patient=${patient.id}`}>
                                <FileText className="h-4 w-4 mr-1" />
                                <span className="sr-only md:not-sr-only md:ml-1 md:text-xs">Documentos</span>
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            ) : (
              <div className="text-center py-10">
                <User className="mx-auto h-12 w-12 text-muted-foreground opacity-30" />
                <h3 className="mt-4 text-lg font-semibold">No se encontraron pacientes</h3>
                <p className="text-muted-foreground">
                  {searchTerm ? 'No hay resultados para tu búsqueda' : 'Agrega pacientes para verlos aquí'}
                </p>
                {!searchTerm && (
                  <Button className="mt-4" asChild>
                    <Link href="/profile?tab=patients">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Agregar Paciente
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AllPatients;