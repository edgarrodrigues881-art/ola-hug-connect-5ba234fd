import { motion } from "framer-motion";

const PositioningSection = () => (
  <section className="py-24">
    <div className="container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl mx-auto text-center"
      >
        <span className="inline-block text-xs font-semibold text-primary tracking-widest uppercase mb-3">
          Posicionamento
        </span>
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
          Construído para quem leva operação a sério
        </h2>
        <p className="text-lg text-gray-400 leading-relaxed">
          A plataforma foi desenvolvida para operadores que precisam de organização, estrutura e previsibilidade no gerenciamento de múltiplos números. Não vendemos promessas irreais. Entregamos ferramentas para estruturar sua estratégia com controle.
        </p>
      </motion.div>
    </div>
  </section>
);

export default PositioningSection;
