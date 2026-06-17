import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api, extractErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import Logo from "@/components/Logo";

const schema = z.object({
  firstName: z.string().min(1, "Nombre requerido"),
  lastNameP: z.string().min(1, "Apellido paterno requerido"),
  lastNameM: z.string().optional(),
  email: z.string().email("Correo invalido"),
  password: z.string().min(8, "Minimo 8 caracteres"),
  confirmPassword: z.string(),
  phone: z.string().optional(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Las contrasenas no coinciden",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setRegistering(true);
    setError(null);
    try {
      const res = await api.post("/auth/register", {
        firstName: data.firstName,
        lastNameP: data.lastNameP,
        lastNameM: data.lastNameM || undefined,
        email: data.email,
        password: data.password,
        phone: data.phone || undefined,
      });
      setSession({
        accessToken: res.data.tokens.accessToken,
        user: res.data.user,
      });
      navigate("/");
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-alt p-6">
      <div className="card max-w-lg w-full space-y-6">
        <Logo className="h-10 mx-auto" />
        <div className="text-center">
          <h2 className="text-xl font-semibold text-ink-900">Crear cuenta</h2>
          <p className="text-sm text-ink-500 mt-1">
            Registrate como paciente para agendar tus citas.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
            <p className="text-sm text-danger-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="label">Nombre *</label>
              <input {...register("firstName")} className="input" placeholder="Juan" />
              {errors.firstName && <p className="text-xs text-danger-600 mt-1">{errors.firstName.message}</p>}
            </div>
            <div>
              <label className="label">Apellido paterno *</label>
              <input {...register("lastNameP")} className="input" placeholder="Perez" />
              {errors.lastNameP && <p className="text-xs text-danger-600 mt-1">{errors.lastNameP.message}</p>}
            </div>
            <div>
              <label className="label">Apellido materno</label>
              <input {...register("lastNameM")} className="input" placeholder="Lopez" />
            </div>
          </div>

          <div>
            <label className="label">Correo electronico *</label>
            <input type="email" {...register("email")} className="input" placeholder="correo@ejemplo.com" />
            {errors.email && <p className="text-xs text-danger-600 mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="label">Telefono</label>
            <input type="tel" {...register("phone")} className="input" placeholder="+525511223344" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Contrasena *</label>
              <input type="password" {...register("password")} className="input" placeholder="Min. 8 caracteres" />
              {errors.password && <p className="text-xs text-danger-600 mt-1">{errors.password.message}</p>}
            </div>
            <div>
              <label className="label">Confirmar contrasena *</label>
              <input type="password" {...register("confirmPassword")} className="input" placeholder="Repite la contrasena" />
              {errors.confirmPassword && <p className="text-xs text-danger-600 mt-1">{errors.confirmPassword.message}</p>}
            </div>
          </div>

          <button type="submit" disabled={registering} className="btn-primary w-full">
            {registering ? "Registrando..." : "Crear cuenta"}
          </button>
        </form>

        <p className="text-sm text-center text-ink-500">
          ¿Ya tienes cuenta?{" "}
          <Link to="/login" className="text-primary-600 hover:underline">
            Inicia sesion
          </Link>
        </p>
      </div>
    </div>
  );
}
