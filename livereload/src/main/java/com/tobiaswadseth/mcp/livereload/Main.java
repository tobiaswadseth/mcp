package com.tobiaswadseth.mcp.livereload;

import org.bukkit.Bukkit;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.plugin.java.JavaPlugin;

public class Main extends JavaPlugin {

    static Main instance;

    @Override
    public void onEnable() {
        instance = this;
    }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        if (label.equalsIgnoreCase("mcp")) {
            if (args.length < 2) {
                return false;
            }
            String action = args[0];
            String plugin = args[1];
            switch (action) {
                case "enable":
                    PluginUtil.enable(Bukkit.getPluginManager().getPlugin(plugin));
                    break;
                case "load":
                    PluginUtil.load(plugin);
                    break;
                case "reload":
                    PluginUtil.reload(Bukkit.getPluginManager().getPlugin(plugin));
                    break;
                case "unload":
                    PluginUtil.disable(Bukkit.getPluginManager().getPlugin(plugin));
                    break;
                case "disable":
                    PluginUtil.disable(Bukkit.getPluginManager().getPlugin(plugin));
                    break;
                default:
                    return false;
            }
            return true;
        }
        return false;
    }
}
