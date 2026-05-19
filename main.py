import tkinter as tk
from tkinter import ttk, messagebox
import heapq

# --- Estructura del Grafo ---
class Graph:
    def __init__(self):
        # 11 Nodos estáticos. 0 es el Vertedero.
        self.nodes = {
            0: {'name': '0 (Vertedero)', 'x': 100, 'y': 100, 'basura': 'Ninguna'},
            1: {'name': '1', 'x': 300, 'y': 100, 'basura': 'Ninguna'},
            2: {'name': '2', 'x': 500, 'y': 100, 'basura': 'Ninguna'},
            3: {'name': '3', 'x': 100, 'y': 300, 'basura': 'Ninguna'},
            4: {'name': '4', 'x': 300, 'y': 300, 'basura': 'Ninguna'},
            5: {'name': '5', 'x': 500, 'y': 300, 'basura': 'Ninguna'},
            6: {'name': '6', 'x': 100, 'y': 500, 'basura': 'Ninguna'},
            7: {'name': '7', 'x': 300, 'y': 500, 'basura': 'Ninguna'},
            8: {'name': '8', 'x': 500, 'y': 500, 'basura': 'Ninguna'},
            9: {'name': '9', 'x': 200, 'y': 200, 'basura': 'Ninguna'},
            10: {'name': '10', 'x': 400, 'y': 400, 'basura': 'Ninguna'}
        }
        
        # Lista de Adyacencia (grafo no dirigido)
        self.edges = {
            0: {1: 200, 3: 200, 9: 141},
            1: {0: 200, 2: 200, 4: 200, 9: 141},
            2: {1: 200, 5: 200},
            3: {0: 200, 4: 200, 6: 200, 9: 141},
            4: {1: 200, 3: 200, 5: 200, 7: 200, 9: 141, 10: 141},
            5: {2: 200, 4: 200, 8: 200, 10: 141},
            6: {3: 200, 7: 200},
            7: {4: 200, 6: 200, 8: 200, 10: 141},
            8: {5: 200, 7: 200, 10: 141},
            9: {0: 141, 1: 141, 3: 141, 4: 141},
            10: {4: 141, 5: 141, 7: 141, 8: 141}
        }
        
        self.colores_basura = {
            'Ninguna': 'white',
            'Reciclable': 'lightblue',
            'Orgánica': 'lightgreen',
            'Ordinaria': 'gray'
        }

    def dijkstra(self, start):
        distances = {n: float('inf') for n in self.nodes}
        distances[start] = 0
        pq = [(0, start)]
        previous = {n: None for n in self.nodes}

        while pq:
            current_dist, current_node = heapq.heappop(pq)

            if current_dist > distances[current_node]:
                continue

            for neighbor, weight in self.edges[current_node].items():
                distance = current_dist + weight
                if distance < distances[neighbor]:
                    distances[neighbor] = distance
                    previous[neighbor] = current_node
                    heapq.heappush(pq, (distance, neighbor))
                    
        return distances, previous

    def get_shortest_path(self, start, end):
        distances, previous = self.dijkstra(start)
        path = []
        current = end
        while current is not None:
            path.append(current)
            if current == start:
                break
            current = previous[current]
        path.reverse()
        return path, distances[end]

# --- Interfaz Gráfica ---
class WasteCollectionApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Sistema Inteligente de Recolección de Residuos")
        self.graph = Graph()
        
        # Marco Principal
        self.main_frame = ttk.Frame(self.root, padding="10")
        self.main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Canvas para el grafo
        self.canvas = tk.Canvas(self.main_frame, width=600, height=600, bg="white", relief=tk.RAISED, bd=2)
        self.canvas.grid(row=0, column=0, rowspan=2, padx=10, pady=10)
        
        # Panel de Controles (Derecha)
        self.control_frame = ttk.Frame(self.main_frame)
        self.control_frame.grid(row=0, column=1, sticky=(tk.N, tk.W, tk.E))
        
        self._setup_citizen_panel()
        self._setup_company_panel()
        
        # Elementos visuales (IDs guardados para actualizar luego)
        self.node_ovals = {}
        self.node_texts = {}
        self.edge_lines = {}
        
        self.draw_graph()

    def _setup_citizen_panel(self):
        lf = ttk.LabelFrame(self.control_frame, text="Panel del Ciudadano", padding="10")
        lf.pack(fill=tk.X, pady=10)
        
        ttk.Label(lf, text="Punto (Nodo):").grid(row=0, column=0, sticky=tk.W, pady=5)
        self.combo_node = ttk.Combobox(lf, values=[str(n) for n in self.graph.nodes if n != 0], state="readonly", width=15)
        self.combo_node.grid(row=0, column=1, pady=5)
        self.combo_node.set("1")
        
        ttk.Label(lf, text="Tipo Residuos:").grid(row=1, column=0, sticky=tk.W, pady=5)
        self.combo_type = ttk.Combobox(lf, values=["Reciclable", "Orgánica", "Ordinaria", "Ninguna"], state="readonly", width=15)
        self.combo_type.grid(row=1, column=1, pady=5)
        self.combo_type.set("Reciclable")
        
        btn = ttk.Button(lf, text="Reportar Basura", command=self.report_waste)
        btn.grid(row=2, column=0, columnspan=2, pady=10)

    def _setup_company_panel(self):
        lf = ttk.LabelFrame(self.control_frame, text="Panel de Empresa (Enrutamiento)", padding="10")
        lf.pack(fill=tk.X, pady=10)
        
        ttk.Button(lf, text="Recoger Reciclaje", command=lambda: self.collect_waste('Reciclable')).pack(fill=tk.X, pady=5)
        ttk.Button(lf, text="Recoger Orgánica", command=lambda: self.collect_waste('Orgánica')).pack(fill=tk.X, pady=5)
        ttk.Button(lf, text="Recoger Ordinaria", command=lambda: self.collect_waste('Ordinaria')).pack(fill=tk.X, pady=5)
        
        self.lbl_status = ttk.Label(lf, text="Camión en espera (Nodo 0)")
        self.lbl_status.pack(pady=10)

    def draw_graph(self):
        self.canvas.delete("all")
        self.edge_lines.clear()
        
        # Dibujar aristas
        for u in self.graph.edges:
            for v, weight in self.graph.edges[u].items():
                if u < v: # Evitar dibujar dos veces
                    x1, y1 = self.graph.nodes[u]['x'], self.graph.nodes[u]['y']
                    x2, y2 = self.graph.nodes[v]['x'], self.graph.nodes[v]['y']
                    line = self.canvas.create_line(x1, y1, x2, y2, fill="black", width=2)
                    self.edge_lines[(u, v)] = line
                    self.edge_lines[(v, u)] = line
                    # Text del peso (distancia)
                    self.canvas.create_text((x1+x2)/2, (y1+y2)/2, text=str(weight), fill="darkblue")

        # Dibujar Nodos
        r = 15
        for n_id, data in self.graph.nodes.items():
            x, y = data['x'], data['y']
            color = self.graph.colores_basura[data['basura']]
            ov = self.canvas.create_oval(x-r, y-r, x+r, y+r, fill=color, outline="black", width=2)
            self.node_ovals[n_id] = ov
            
            # Text Node ID
            txt = self.canvas.create_text(x, y, text=str(n_id), font=("Arial", 10, "bold"))
            self.node_texts[n_id] = txt
            
            # Etiqueta de vertedero
            if n_id == 0:
                self.canvas.create_text(x, y-25, text="Vertedero", fill="red", font=("Arial", 9, "bold"))

    def report_waste(self):
        node_id = int(self.combo_node.get())
        waste_type = self.combo_type.get()
        
        # Update model
        self.graph.nodes[node_id]['basura'] = waste_type
        
        # Update view
        color = self.graph.colores_basura[waste_type]
        self.canvas.itemconfig(self.node_ovals[node_id], fill=color)
        
        messagebox.showinfo("Reporte", f"Basura en Nodo {node_id} actualizada a: {waste_type}")

    def collect_waste(self, waste_type):
        destinations = [n_id for n_id, data in self.graph.nodes.items() if data['basura'] == waste_type]
        
        if not destinations:
            messagebox.showinfo("Logística", f"No hay basura {waste_type} reportada.")
            return
        
        self.lbl_status.config(text=f"Calculando ruta para: {waste_type}...")
        self.root.update()
        
        # Reset color de las aristas a negro
        for line in self.edge_lines.values():
            self.canvas.itemconfig(line, fill="black", width=2)
        
        current_node = 0
        full_path = [0]
        unvisited = destinations.copy()
        
        # Algoritmo Vecino Más Cercano usando distancias reales (Dijkstra)
        while unvisited:
            distances, previous = self.graph.dijkstra(current_node)
            
            # Encontrar el destino más cercano
            closest_node = None
            min_dist = float('inf')
            
            for dest in unvisited:
                if distances[dest] < min_dist:
                    min_dist = distances[dest]
                    closest_node = dest
            
            # Trayecto hacia el más cercano
            path, _ = self.graph.get_shortest_path(current_node, closest_node)
            
            # Agregamos la ruta omitiendo el nodo inicial si ya está en full_path
            for node in path[1:]:
                full_path.append(node)
                
            # Llegamos, recoger basura
            current_node = closest_node
            unvisited.remove(current_node)
            self.graph.nodes[current_node]['basura'] = 'Ninguna'
        
        # Volver al vertedero
        if current_node != 0:
            path_home, _ = self.graph.get_shortest_path(current_node, 0)
            for node in path_home[1:]:
                full_path.append(node)
                
        self.animate_route(full_path, waste_type)

    def animate_route(self, path, waste_type):
        self.lbl_status.config(text=f"Ruta: {' -> '.join(map(str, path))}")
        
        # Recorremos paso a paso el array para resaltar la ruta en rojo
        for i in range(len(path) - 1):
            u = path[i]
            v = path[i+1]
            if (u, v) in self.edge_lines:
                line = self.edge_lines[(u, v)]
                self.canvas.itemconfig(line, fill="red", width=4)
        
        # Restaurar el color de los nodos barridos
        for n_id in self.graph.nodes:
            color = self.graph.colores_basura[self.graph.nodes[n_id]['basura']]
            self.canvas.itemconfig(self.node_ovals[n_id], fill=color)
            
        messagebox.showinfo("Ruta Completada", f"Se ha completado la ruta de recolección de basura {waste_type}.\nCamión regresó al vertedero.")
        self.lbl_status.config(text="Camión en espera (Nodo 0)")

if __name__ == "__main__":
    root = tk.Tk()
    app = WasteCollectionApp(root)
    root.mainloop()
