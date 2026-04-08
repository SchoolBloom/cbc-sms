import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Eye, EyeOff, GraduationCap, Loader2 } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  
  // Signup form state
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await signIn(loginEmail, loginPassword);
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Welcome back!");
      navigate("/");
    }
    
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupPassword !== signupConfirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    setLoading(true);
    
    const { error } = await signUp(signupEmail, signupPassword, signupName);
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Account created. Please contact your admin for access.");
      navigate("/awaiting-allocation");
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(11,106,98,0.08),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(199,112,64,0.12),_transparent_50%)] flex flex-col">
      <div className="relative w-full flex-1 flex items-stretch justify-center">
        <div className="relative w-full max-w-6xl grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 px-6 py-10 lg:py-16">
          {/* Ambient background shapes */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-16 left-8 h-56 w-56 rounded-full bg-[conic-gradient(from_160deg,_rgba(11,106,98,0.15),_transparent_70%)] blur-2xl" />
            <div className="absolute bottom-10 right-6 h-64 w-64 rounded-full bg-[radial-gradient(circle,_rgba(199,112,64,0.18),_transparent_65%)] blur-3xl" />
          </div>

        {/* Hero */}
        <div className="relative z-10 flex flex-col justify-center gap-8">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-[#0B6A62] flex items-center justify-center shadow-[0_12px_30px_-18px_rgba(11,106,98,0.8)]">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1
                className="text-3xl font-semibold text-foreground"
                style={{ fontFamily: "Fraunces, 'Iowan Old Style', 'Palatino Linotype', serif" }}
              >
                School Bloom
              </h1>
              <p className="text-sm text-muted-foreground">School management</p>
            </div>
          </div>

          <div className="space-y-4">
            <h2
              className="text-4xl md:text-5xl leading-tight text-foreground"
              style={{ fontFamily: "Fraunces, 'Iowan Old Style', 'Palatino Linotype', serif" }}
            >
              A calmer way to run school life.
            </h2>
            <p className="text-base text-muted-foreground max-w-lg">
              Track CBC performance, assign learning areas, and keep families in the loop, all in one place.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-md">
            {[
              { label: "CBC-ready", value: "Primary, JSS, SSS" },
              { label: "Assessments", value: "Real‑time" },
              { label: "Attendance", value: "Daily" },
              { label: "Reporting", value: "Instant" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-border/60 bg-card/70 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
                <p className="text-lg font-semibold text-foreground">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Auth card */}
        <div className="relative z-10 flex min-h-full flex-col pt-16 lg:pt-28 justify-center items-center">
          <Card className="w-full border-border/50 shadow-[0_25px_70px_-45px_rgba(11,106,98,0.6)]">
            <Tabs defaultValue="login" className="w-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-2xl">Welcome back</CardTitle>
                <CardDescription>Sign in to continue. New here? Create an account.</CardDescription>
                <TabsList className="mt-4 grid w-full grid-cols-2 rounded-full border border-[#0B6A62]/20 bg-[linear-gradient(120deg,rgba(11,106,98,0.12),rgba(199,112,64,0.10))] p-1 shadow-[inset_0_0_0_1px_rgba(11,106,98,0.08)]">
                  <TabsTrigger
                    value="login"
                    className="rounded-full border-b-2 border-transparent text-sm font-semibold text-muted-foreground transition data-[state=active]:border-[#0B6A62] data-[state=active]:bg-white/90 data-[state=active]:text-foreground data-[state=active]:shadow-[0_6px_16px_-12px_rgba(11,106,98,0.6)]"
                  >
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger
                    value="signup"
                    className="rounded-full border-b-2 border-transparent text-sm font-semibold text-muted-foreground transition data-[state=active]:border-[#0B6A62] data-[state=active]:bg-white/90 data-[state=active]:text-foreground data-[state=active]:shadow-[0_6px_16px_-12px_rgba(11,106,98,0.6)]"
                  >
                    Create Account
                  </TabsTrigger>
                </TabsList>
              </CardHeader>

              <CardContent>
                <TabsContent value="login" className="mt-0">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="you@example.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <div className="relative">
                        <Input
                          id="login-password"
                          type={showLoginPassword ? "text" : "password"}
                          placeholder="Password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          required
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword((prev) => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          aria-label={showLoginPassword ? "Hide password" : "Show password"}
                        >
                          {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        "Sign In"
                      )}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="mt-0">
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Full Name</Label>
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Sanaet Memusi"
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="you@example.com"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <div className="relative">
                        <Input
                          id="signup-password"
                          type={showSignupPassword ? "text" : "password"}
                          placeholder="Password"
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          required
                          minLength={6}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignupPassword((prev) => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          aria-label={showSignupPassword ? "Hide password" : "Show password"}
                        >
                          {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                      <div className="relative">
                        <Input
                          id="signup-confirm-password"
                          type={showSignupConfirmPassword ? "text" : "password"}
                          placeholder="Password"
                          value={signupConfirmPassword}
                          onChange={(e) => setSignupConfirmPassword(e.target.value)}
                          required
                          minLength={6}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignupConfirmPassword((prev) => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          aria-label={showSignupConfirmPassword ? "Hide password" : "Show password"}
                        >
                          {showSignupConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      Roles are assigned by an administrator after signup.
                    </p>
                  </form>
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>
      </div>
      </div>
      <footer>
        <div className="w-full px-7 pb-7 flex justify-center">
        <div className="text-center text-xs text-muted-foreground">
          <p className="uppercase tracking-[0.05em]">Powered by</p>
          <div className="mt-1 flex flex-col items-center">
            <img
              src="/sirnaet-logo.png"
              alt="Sirnaet logo"
              className="h-12 w-12 object-contain"
              loading="lazy"
            />
            <p className="mt-1 text-sm font-semibold text-foreground">SIR NAET</p>
          </div>
        </div>
      </div>
      </footer>
    </div>
  );
}
