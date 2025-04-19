import { useQuery } from "@tanstack/react-query";
import { User, Pencil, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";

const ProfileCard = () => {
  const { user } = useAuth();
  
  // Fetch detailed user info
  const { data: userData, isLoading } = useQuery({
    queryKey: ["/api/auth/me"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-muted rounded-md w-1/3"></div>
            <div className="h-4 bg-muted rounded-md w-2/3"></div>
            <div className="h-4 bg-muted rounded-md w-full"></div>
            <div className="h-4 bg-muted rounded-md w-full"></div>
            <div className="flex gap-2">
              <div className="h-8 bg-muted rounded-full w-24"></div>
              <div className="h-8 bg-muted rounded-full w-24"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-none">
            {userData?.profile_image ? (
              <img
                src={userData.profile_image}
                alt={userData.full_name}
                className="w-32 h-32 object-cover rounded-lg"
              />
            ) : (
              <div className="w-32 h-32 bg-primary/10 flex items-center justify-center rounded-lg">
                <User className="h-12 w-12 text-primary/50" />
              </div>
            )}
          </div>
          
          <div className="flex-grow space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold font-serif">
                  <span className="block">{userData?.full_name}</span>
                  <span className="block text-primary-500 text-xl">{userData?.specialty}</span>
                </h2>
                <p className="text-sm text-muted-foreground mt-1">{userData?.email}</p>
              </div>
              <Link href="/profile">
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <Pencil className="h-4 w-4" />
                  <span>Editar perfil</span>
                </Button>
              </Link>
            </div>
            
            {userData?.bio && (
              <div>
                <p className="text-sm leading-relaxed whitespace-pre-line">{userData.bio}</p>
              </div>
            )}
            
            {(userData?.education || userData?.certifications) && (
              <div className="space-y-2">
                {userData?.education && (
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                    <p className="text-sm">{userData.education}</p>
                  </div>
                )}
                
                {userData?.certifications && (
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                    <p className="text-sm">{userData.certifications}</p>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex flex-wrap gap-2 pt-2">
              <Badge variant="specialty">Terapia de adultos</Badge>
              <Badge variant="specialty">Trastornos de ansiedad</Badge>
              <Badge variant="specialty">Depresión</Badge>
              <Badge variant="specialty">Atención online</Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfileCard;
